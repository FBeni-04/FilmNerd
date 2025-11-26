import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import { Link } from "react-router-dom";
import { API_BASE } from "./lib/api";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG = {
    profile: (p) => (p ? `https://image.tmdb.org/t/p/w185${p}` : null),
    poster: (p) => (p ? `https://image.tmdb.org/t/p/w185${p}` : null),
};

function useDebounced(value, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function SearchPage() {
    const apiKey = (import.meta.env.VITE_TMDB_API_KEY || "").trim();

    const [type, setType] = useState("movie"); // movie | actor | director | user
    const [query, setQuery] = useState("");
    const dq = useDebounced(query, 400);

    // movie filters
    const [genres, setGenres] = useState([]);
    const [genreId, setGenreId] = useState("");
    const [minRuntime, setMinRuntime] = useState("");
    const [maxRuntime, setMaxRuntime] = useState("");
    const [year, setYear] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [results, setResults] = useState([]);

    // Load genres for movies
    useEffect(() => {
        if (!apiKey) return;
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${TMDB_BASE}/genre/movie/list?api_key=${apiKey}&language=en-US`);
                if (!res.ok) return;
                const j = await res.json();
                if (alive) setGenres(j?.genres || []);
            } catch (e) {
                // Avoid surfacing a blocking UI error here; just log for diagnostics.
                // The page can still function without the genre list.
                console.error("[SearchPage] Failed to load genres:", e);
            }
        })();
        return () => { alive = false; };
    }, [apiKey]);

    // Execute search when inputs change
    useEffect(() => {
        let alive = true;
        async function run() {
            if (!apiKey) { setError("Missing TMDB API key"); return; }
            setLoading(true); setError("");
            try {
                let data = [];
                if (type === "movie") {
                    // If any movie filter applied and no query, use discover; if query present use search then filter client-side.
                    const anyFilter = genreId || minRuntime || maxRuntime || year;
                    if (dq && dq.trim()) {
                        const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&language=en-US&include_adult=false&query=${encodeURIComponent(dq)}&page=1`;
                        const r = await fetch(url);
                        const j = r.ok ? await r.json() : { results: [] };
                        data = (j.results || []).slice(0, 20);
                        // client-side filter
                        data = data.filter((m) => {
                            if (genreId && !(m.genre_ids || []).includes(Number(genreId))) return false;
                            if (year) {
                                const y = m.release_date ? new Date(m.release_date).getFullYear() : null;
                                if (String(year) !== String(y ?? "")) return false;
                            }
                            // runtime not available in this payload; skip unless we fetch details per item
                            return true;
                        });

                        // If runtime filters are requested, fetch per-movie details to get runtime
                        if ((minRuntime || maxRuntime) && data.length) {
                            try {
                                const detailed = await Promise.all(
                                    data.map(async (m) => {
                                        try {
                                            const res = await fetch(`${TMDB_BASE}/movie/${m.id}?api_key=${apiKey}&language=en-US`);
                                            if (!res.ok) return { ...m, _runtime: undefined };
                                            const dj = await res.json();
                                            return { ...m, _runtime: dj?.runtime };
                                        } catch (_) {
                                            return { ...m, _runtime: undefined };
                                        }
                                    })
                                );
                                data = detailed.filter((m) => {
                                    const rt = Number(m._runtime);
                                    if (!isFinite(rt)) return true; // if runtime unknown, do not exclude aggressively
                                    if (minRuntime && rt < Number(minRuntime)) return false;
                                    if (maxRuntime && rt > Number(maxRuntime)) return false;
                                    return true;
                                });
                            } catch (e) {
                                // If details fetch fails, fall back to previously filtered list
                                console.warn("[SearchPage] Failed to fetch runtimes for filtering", e);
                            }
                        }
                    } else if (anyFilter) {
                        const params = new URLSearchParams({
                            api_key: apiKey,
                            language: "en-US",
                            sort_by: "popularity.desc",
                            include_adult: "false",
                            include_video: "false",
                            page: "1",
                        });
                        if (genreId) params.set("with_genres", String(genreId));
                        if (minRuntime) params.set("with_runtime.gte", String(minRuntime));
                        if (maxRuntime) params.set("with_runtime.lte", String(maxRuntime));
                        if (year) params.set("primary_release_year", String(year));
                        const url = `${TMDB_BASE}/discover/movie?${params.toString()}`;
                        const r = await fetch(url);
                        const j = r.ok ? await r.json() : { results: [] };
                        data = (j.results || []).slice(0, 20);
                    } else {
                        // no query, no filters → show trending to avoid empty page
                        const r = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${apiKey}&language=en-US`);
                        const j = r.ok ? await r.json() : { results: [] };
                        data = (j.results || []).slice(0, 20);
                    }
                    if (alive) setResults(data.map((m) => ({
                        kind: "movie",
                        id: m.id,
                        title: m.title,
                        poster_path: m.poster_path,
                        release_date: m.release_date,
                        vote_average: m.vote_average,
                    })));
                } else if (type === "user") {
                    if (!dq.trim()) {
                        setResults([]);
                        setLoading(false);
                        return;
                    }
                    const url = `${API_BASE}/users/search/?q=${encodeURIComponent(dq)}`;
                    const r = await fetch(url);
                    const j = r.ok ? await r.json() : [];
                    const list = Array.isArray(j) ? j.slice(0, 20) : [];
                    if (alive) setResults(list.map((u) => ({
                        kind: "user",
                        id: u.id,
                        username: u.username,
                        name: u.name,
                    })));
                }   else {
                    // person search
                    if (!dq.trim()) { setResults([]); setLoading(false); return; }
                    const url = `${TMDB_BASE}/search/person?api_key=${apiKey}&language=en-US&include_adult=false&page=1&query=${encodeURIComponent(dq)}`;
                    const r = await fetch(url);
                    const j = r.ok ? await r.json() : { results: [] };
                    let list = (j.results || []);
                    list = list.filter((p) => {
                        const dep = String(p.known_for_department || "");
                        if (type === "actor") return dep.toLowerCase() === "acting";
                        if (type === "director") return dep.toLowerCase() === "directing";
                        return true;
                    }).slice(0, 20);
                    if (alive) setResults(list.map((p) => ({
                        kind: type,
                        id: p.id,
                        name: p.name,
                        profile_path: p.profile_path,
                        known_for_department: p.known_for_department,
                    })));
                }
            } catch (e) {
                if (alive) setError(String(e?.message || e));
            } finally {
                if (alive) setLoading(false);
            }
        }
        run();
        return () => { alive = false; };
    }, [type, dq, genreId, minRuntime, maxRuntime, year, apiKey]);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-6">
                <h1 className="text-2xl font-bold">Search</h1>
                {!apiKey && (
                    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        Missing VITE_TMDB_API_KEY in frontend .env file.
                    </div>
                )}

                {/* Controls */}
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm text-neutral-300 mb-1">Search type</label>
                        <select
                            className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="movie">Movie title</option>
                            <option value="actor">Actor/Actress</option>
                            <option value="director">Director</option>
                            <option value="user">User</option>
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-sm text-neutral-300 mb-1">Query</label>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={
                                type === "movie"
                                    ? "Search movies…"
                                    : type === "actor"
                                        ? "Search actors/actresses…"
                                        : type === "director"
                                            ? "Search directors…"
                                            : "Search users…"
                            }
                            className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                        />
                    </div>
                </div>

                {/* Movie filters */}
                {type === "movie" && (
                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <div>
                            <label className="block text-sm text-neutral-300 mb-1">Genre</label>
                            <select
                                className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                                value={genreId}
                                onChange={(e) => setGenreId(e.target.value)}
                            >
                                <option value="">Any</option>
                                {genres.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-300 mb-1">Min runtime (min)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                                value={minRuntime}
                                onChange={(e) => setMinRuntime(e.target.value)}
                                placeholder="e.g. 60"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-300 mb-1">Max runtime (min)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                                value={maxRuntime}
                                onChange={(e) => setMaxRuntime(e.target.value)}
                                placeholder="e.g. 180"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-300 mb-1">Year</label>
                            <input
                                type="number"
                                min="1900"
                                max="2100"
                                className="w-full rounded-lg border border-white/10 bg-neutral-900 p-2"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="e.g. 1999"
                            />
                        </div>
                    </div>
                )}

                {/* Status */}
                <div className="mt-4 text-sm text-neutral-400">
                    {loading ? "Searching…" : error ? <span className="text-red-400">{error}</span> : results.length ? `${results.length} results` : dq ? "No results" : ""}
                </div>

                {/* Results */}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {results.map((it) => (
                        it.kind === "movie" ? (
                            <Link key={`m-${it.id}`} to={`/movie/${it.id}`} className="group block rounded-lg border border-white/10 bg-neutral-900 overflow-hidden">
                                {it.poster_path ? (
                                    <img src={IMG.poster(it.poster_path)} alt={it.title} className="aspect-[2/3] w-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="aspect-[2/3] w-full bg-neutral-800" />
                                )}
                                <div className="p-2">
                                    <div className="truncate text-sm font-medium text-neutral-100">{it.title}</div>
                                    <div className="text-xs text-neutral-400">
                                        {(it.release_date ? new Date(it.release_date).getFullYear() : "")} · ⭐ {isFinite(it.vote_average) ? (it.vote_average ?? 0).toFixed(1) : "–"}
                                    </div>
                                </div>
                            </Link>
                        ) : it.kind === "user" ? (
                            <Link key={`u-${it.id}`} to={`/users/${it.username}`} className="group flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-900 p-3">
                                <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 text-sm">
                                    {(it.name || it.username || "?").slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate font-medium text-neutral-100">{it.name || it.username}</div>
                                    <div className="text-xs text-neutral-400">@{it.username}</div>
                                </div>
                            </Link>
                        ) : (
                            <Link key={`p-${it.id}`} to={it.kind === "director" ? `/director/${it.id}` : `/actor/${it.id}`} className="group flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-900 p-3">
                                {it.profile_path ? (
                                    <img src={IMG.profile(it.profile_path)} alt={it.name} className="h-16 w-16 rounded object-cover" loading="lazy" />
                                ) : (
                                    <div className="h-16 w-16 rounded bg-neutral-800" />
                                )}
                                <div className="min-w-0">
                                    <div className="truncate font-medium text-neutral-100">{it.name}</div>
                                    <div className="text-xs text-neutral-400">{it.known_for_department}</div>
                                </div>
                            </Link>
                        )
                    ))}
                </div>
            </main>
        </div>
    );
}
