import React, { useEffect, useRef, useState } from "react";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";

/* ——— Lokális helper-ek ——— */
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = {
  w92: (p) => `https://image.tmdb.org/t/p/w92${p}`,
};
const getYear = (s) => (s ? String(new Date(s).getFullYear()) : "");

/* Debounce hook – minimális, dependency nélkül */
function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

/* ——— TMDB kereső ——— */
async function searchTmdbMovies(query, apiKey, page = 1) {
  if (!query?.trim()) return { results: [] };
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&language=en-US&include_adult=false&page=${page}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return await res.json();
}

export default function SearchBox({ onSelect }) {
  const tmdbApiKey = (import.meta.env.VITE_TMDB_API_KEY || "").trim();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const dq = useDebouncedValue(q, 350);

  const rootRef = useRef(null);

  // Kívül kattintás – zárás
  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Keresés
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!dq.trim()) { setResults([]); setError(""); setLoading(false); return; }
      if (!tmdbApiKey) { setError("Hiányzó TMDB API kulcs"); return; }
      setLoading(true); setError("");
      try {
        const j = await searchTmdbMovies(dq, tmdbApiKey, 1);
        if (alive) setResults((j?.results || []).slice(0, 8));
      } catch (e) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [dq, tmdbApiKey]);

  // Nincs kulcs eset
  if (!tmdbApiKey) {
    return (
      <div className="relative w-full md:w-80 md:max-w-sm">
        <input
          disabled
          className="w-full rounded-full border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-400"
          placeholder="Add meg a VITE_TMDB_API_KEY-t a .env-ben"
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full md:w-80 md:max-w-sm">
      {/* input sor */}
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus-within:ring-2 focus-within:ring-emerald-500/40">
        <FaMagnifyingGlass className="h-4 w-4 shrink-0" aria-hidden />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent outline-none placeholder:text-neutral-500"
          placeholder="Search movies..."
          aria-label="Search movies"
        />
        {q && (
          <button
            type="button"
            aria-label="Törlés"
            onClick={() => { setQ(""); setResults([]); }}
            className="text-neutral-400 hover:text-neutral-200"
          >
            <FaXmark className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* dropdown */}
      {open && (results.length || loading || error) && (
        <div
          className="
            absolute z-50 mt-2
            left-0 right-0 mx-2 md:mx-0
            md:left-auto md:right-0 md:w-full
            overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-xl
          "
          role="listbox"
          aria-label="TMDB találatok"
        >
          <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-400">
            <span>TMDB results</span>
            <button type="button" className="rounded px-2 py-0.5 hover:bg-white/5" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          {loading && <div className="px-4 py-6 text-sm text-neutral-300">Searching…</div>}
          {error && !loading && <div className="px-4 py-6 text-sm text-red-400">{error}</div>}

          {!loading && !error && (
            <ul className="max-h-72 overflow-auto divide-y divide-white/10">
              {results.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-3 hover:bg-white/5">
                  <a
                    href={`/movie/${m.id}`}
                    className="flex w-full items-center gap-3"
                    onClick={(e) => {
                      setOpen(false);
                      if (onSelect) { e.preventDefault(); onSelect(m.id, m); }
                    }}
                  >
                    {m.poster_path ? (
                      <img
                        src={TMDB_IMG.w92(m.poster_path)}
                        alt={`${m.title} poster`}
                        className="h-16 w-11 rounded object-cover bg-neutral-800"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-16 w-11 rounded bg-neutral-800" aria-hidden />
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm text-neutral-100">{m.title}</div>
                      <div className="mt-0.5 text-xs text-neutral-400">
                        {getYear(m.release_date)} · ⭐ {m.vote_average?.toFixed?.(1) ?? "–"}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-4 py-6 text-sm text-neutral-300">No results.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
