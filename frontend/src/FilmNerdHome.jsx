import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaStar,
} from "react-icons/fa6";
import Navbar from "./components/Navbar";
import AuthProvider, { useAuthOptional } from "./components/AuthContext";
import AuthModal from "./components/AuthModal";
import { API_BASE } from "./lib/api";
import { Link } from "react-router-dom";

/**
 * ==========================
 *  CONFIG / CONSTANTS
 * ==========================
 */
const RECOMMENDED_IDS = [238, 680, 550, 603, 27205, 155, 424, 278, 603692, 539];
const FRIENDS_FAVORITES_IDS = [603, 11, 1891, 122, 424, 807, 1892, 603692, 98, 24428];
const ADMINS_FAVORITES_IDS = [503919, 792307, 21484, 11167, 7452, 8321, 265195, 359940, 68718, 115];

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = {
  w92: (p) => `https://image.tmdb.org/t/p/w92${p}`,
  w185: (p) => `https://image.tmdb.org/t/p/w185${p}`,
  w342: (p) => `https://image.tmdb.org/t/p/w342${p}`,
};
const tmdbApiKey = (import.meta.env.VITE_TMDB_API_KEY || "").trim();

const reviewSummaryCache = new Map(); // key: movieId, value: {count, avg}

/** 1–10 score → emoji */
function ratingToEmoji(num) {
  const n = Number(num);
  if (!isFinite(n) || n <= 2) return "😡";
  if (n <= 4) return "🙁";
  if (n <= 6) return "😐";
  if (n <= 8) return "🙂";
  return "🤩";
}

/**
 * ==========================
 *  TMDB HELPERS
 * ==========================
 */
const cache = new Map();
const toTmdbId = (v) => {
  const m = String(v ?? "").match(/^\d+/);
  return m ? Number(m[0]) : null;
};

async function fetchMovie(sourceId) {
  const tmdbId = toTmdbId(sourceId);
  if (!tmdbId) throw new Error(`Invalid TMDB ID: ${sourceId}`);
  const key = `movie:${tmdbId}`;
  if (cache.has(key)) return { ...cache.get(key), _sourceId: sourceId };

  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${tmdbApiKey}&language=en-US&append_to_response=credits,keywords`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `TMDB error: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.status_message) msg += ` – ${j.status_message}`;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  cache.set(key, data);
  return { ...data, _sourceId: sourceId };
}

async function fetchMovies(ids = []) {
  return Promise.all(
    ids
      .map((id) => ({ id, tmdbId: toTmdbId(id) }))
      .filter(({ tmdbId }) => tmdbId != null)
      .map(async ({ id }) => {
        try {
          return await fetchMovie(id);
        } catch (e) {
          return { id, _sourceId: id, error: String(e) };
        }
      })
  );
}

async function fetchTrendingMovieIds(limit = 10) {
  const url = `${TMDB_BASE}/trending/movie/week?api_key=${tmdbApiKey}&language=hu-HU`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trending fetch failed (${res.status})`);
  const j = await res.json();
  return (j?.results || []).slice(0, limit).map((m) => m.id);
}

/**
 * ==========================
 *  FAVOURITES HELPERS
 * ==========================
 */

// Fetch user's favourites from backend (Favourite model)
async function fetchUserFavouriteMovieIds(access) {
  const headers = {};
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  console.log("fetchUserFavouriteMovieIds: using headers:", headers);

  const res = await fetch(`${API_BASE}/favourites/`, {
    headers,
    credentials: "include", // if you also rely on cookies/sessions
  });

  console.log("fetchUserFavouriteMovieIds: response status:", res.status);

  if (!res.ok) {
    throw new Error(`Favourites fetch failed (${res.status})`);
  }

  const data = await res.json();
  console.log("fetchUserFavouriteMovieIds: raw data from backend:", data);

  // DRF pagination: { count, next, previous, results: [...] }
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.results)
    ? data.results
    : [];

  if (!items.length) {
    console.warn("fetchUserFavouriteMovieIds: no items found in response");
    return [];
  }

  // Structure:
  // { id, user_id, movie_id: "503919" }
  const ids = items
    .map((f) => {
      if (f.movie_id != null) {
        return f.movie_id;
      }
      if (f.movie && f.movie.tmdb_id != null) {
        return f.movie.tmdb_id;
      }
      if (f.movie && f.movie.id != null) {
        return f.movie.id;
      }
      return null;
    })
    .filter((id) => id != null);

  console.log("fetchUserFavouriteMovieIds: extracted movie IDs:", ids);
  return ids;
}

// simple "top N" helper
function topN(map, n = 3) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

/**
 * Build TMDB recommendation list from favourites
 * Uses genres, directors, cast AND keywords (keywords are the strongest signal).
 */
async function buildRecommendationsFromFavourites(favIds) {
  if (!favIds?.length || !tmdbApiKey) return [];

  // Limit the number of favourites we inspect to avoid too many TMDB calls
  const sampleFavIds = favIds.slice(0, 10);
  const favMovies = await fetchMovies(sampleFavIds);

  const genreCount = new Map();
  const directorCount = new Map();
  const castCount = new Map();
  const keywordCount = new Map(); // thematic / keyword-based signal

  for (const m of favMovies) {
    if (!m || m.error) continue;

    // Genres
    (m.genres || []).forEach((g) => {
      if (!g?.id) return;
      genreCount.set(g.id, (genreCount.get(g.id) || 0) + 1);
    });

    // Directors
    (m.credits?.crew || [])
      .filter((p) => p.job === "Director")
      .forEach((p) => {
        if (!p?.id) return;
        directorCount.set(p.id, (directorCount.get(p.id) || 0) + 1);
      });

    // Cast (e.g. top 5)
    (m.credits?.cast || [])
      .slice(0, 5)
      .forEach((p) => {
        if (!p?.id) return;
        castCount.set(p.id, (castCount.get(p.id) || 0) + 1);
      });

    // Keywords – movie form: { keywords: [ {id, name}, ... ] }
    const keywordArray = Array.isArray(m.keywords)
      ? m.keywords
      : Array.isArray(m.keywords?.keywords)
      ? m.keywords.keywords
      : [];

    keywordArray.forEach((kw) => {
      if (!kw?.id) return;
      keywordCount.set(kw.id, (keywordCount.get(kw.id) || 0) + 1);
    });
  }

  const topGenreIds = topN(genreCount, 3);
  const topDirectorIds = topN(directorCount, 2);
  const topCastIds = topN(castCount, 3);
  const topKeywordIds = topN(keywordCount, 2); // a couple of strongest thematic keywords

  console.log(
    "buildRecommendationsFromFavourites: keywordCount:",
    Array.from(keywordCount.entries())
  );
  console.log(
    "buildRecommendationsFromFavourites: topKeywordIds:",
    topKeywordIds
  );

  // If we literally have nothing to go on, bail out
  if (
    !topGenreIds.length &&
    !topDirectorIds.length &&
    !topCastIds.length &&
    !topKeywordIds.length
  ) {
    console.log(
      "buildRecommendationsFromFavourites: no signal at all (no genres, directors, cast, keywords)"
    );
    return [];
  }

  const favTmdbIds = sampleFavIds
    .map((id) => toTmdbId(id))
    .filter((x) => x != null);
  const seenFavourites = new Set(favTmdbIds);

  // Helper for discover calls
  async function discover(paramsObj, label) {
    const params = new URLSearchParams({
      api_key: tmdbApiKey,
      language: "en-US",
      sort_by: "popularity.desc",
      page: "1",
      ...paramsObj,
    });
    const url = `${TMDB_BASE}/discover/movie?${params.toString()}`;
    console.log("discover() call", label, "→", url);
    const res = await fetch(url);
    console.log("discover() status", label, "→", res.status);
    if (!res.ok) return [];
    const j = await res.json();
    const results = j?.results || [];
    console.log(
      "discover() results length",
      label,
      "→",
      results.length
    );
    return results;
  }

  const [byKeywords, byGenre, byCast, byDirector] = await Promise.all([
    topKeywordIds.length
      ? discover(
          { with_keywords: topKeywordIds.join("|") }, // OR logic between keywords
          "keywords"
        )
      : [],
    topGenreIds.length
      ? discover({ with_genres: topGenreIds.join(",") }, "genres")
      : [],
    topCastIds.length
      ? discover({ with_cast: topCastIds.join(",") }, "cast")
      : [],
    topDirectorIds.length
      ? discover({ with_crew: topDirectorIds.join(",") }, "directors")
      : [],
  ]);

  let allCandidates;

  if (byKeywords.length) {
    // STRONG thematic mode: if we have keyword-based results,
    // we ONLY use those as primary signal
    console.log(
      "buildRecommendationsFromFavourites: using KEYWORD-ONLY candidates, count =",
      byKeywords.length
    );
    allCandidates = byKeywords;
  } else {
    // Fallback: no strong keyword signal, use the old genre/cast/director based mix
    console.log(
      "buildRecommendationsFromFavourites: no keyword results, falling back to genres/cast/directors"
    );
    allCandidates = [...byGenre, ...byCast, ...byDirector];
  }

  const out = [];
  const used = new Set();

  for (const m of allCandidates) {
    const id = toTmdbId(m?.id);
    if (!id) continue;
    if (seenFavourites.has(id)) continue; // don't recommend something that is already a favourite
    if (used.has(id)) continue;          // avoid duplicates across the different lists

    used.add(id);
    out.push(id);

    if (out.length >= 10) break; // enough for one row
  }

  console.log(
    "buildRecommendationsFromFavourites: final recommended IDs:",
    out
  );
  return out;
}

/**
 * ==========================
 *  SMALL UTILS / HOOKS
 * ==========================
 */
const getYear = (s) => (s ? String(new Date(s).getFullYear()) : "");
const topCast = (credits, n = 3) =>
  (credits?.cast || [])
    .slice(0, n)
    .map((p) => p.name)
    .join(", ");

function useHorizontalScroll() {
  const elRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e) => {
    const el = elRef.current;
    if (!el) return;
    isDown.current = true;
    el.classList.add("dragging");
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
  };
  const onMouseLeave = () => {
    isDown.current = false;
    elRef.current?.classList.remove("dragging");
  };
  const onMouseUp = () => {
    isDown.current = false;
    elRef.current?.classList.remove("dragging");
  };
  const onMouseMove = (e) => {
    const el = elRef.current;
    if (!el || !isDown.current) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    el.scrollLeft = scrollLeft.current - walk;
  };
  const scrollBy = (offset) => {
    const el = elRef.current;
    if (!el) return;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };
  return { elRef, scrollBy, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
}

/**
 * ==========================
 *  UI BUILDING BLOCKS
 * ==========================
 */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-neutral-900 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-neutral-200 ${className}`}
    >
      {children}
    </span>
  );
}

function IconButton({ children, onClick, ariaLabel }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-neutral-900/80 text-white backdrop-blur hover:bg-neutral-800/80 focus:outline-none"
    >
      <span className="flex items-center justify-center">{children}</span>
    </button>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/**
 * ==========================
 *  MOVIE CARD (with favourite heart)
 * ==========================
 */
export function MovieCard({ movie }) {
  const poster = movie?.poster_path ? TMDB_IMG.w342(movie.poster_path) : null;
  const title = movie?.title || movie?.name || "Unknown title";
  const year = getYear(movie?.release_date);
  const tmdbVote = movie?.vote_average != null ? Number(movie.vote_average) : null;

  const sourceId = movie?._sourceId ?? movie?.id;
  const auth = useAuthOptional();
  const user = auth?.user;
  const access = auth?.access;

  const [summary, setSummary] = useState(
    () => reviewSummaryCache.get(String(sourceId)) || null
  );
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Our own average from cache / API
  useEffect(() => {
    let alive = true;
    const key = String(sourceId || "");
    if (!key) return;

    if (reviewSummaryCache.has(key)) {
      setSummary(reviewSummaryCache.get(key));
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/reviews/summary/?movie_id=${encodeURIComponent(key)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const val = {
          count: Number(json.count || 0),
          avg: Number(json.avg || 0),
        };
        reviewSummaryCache.set(key, val);
        if (alive) setSummary(val);
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [sourceId]);

  // Favourite status
  useEffect(() => {
    let alive = true;
    if (!user || !sourceId) {
      setIsFav(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/favourites/exists/?movie_id=${encodeURIComponent(
            sourceId
          )}`,
          {
            headers: { Authorization: `Bearer ${access}` },
          }
        );
        const j = res.ok ? await res.json() : { exists: false };
        if (alive) setIsFav(Boolean(j.exists));
      } catch {
        if (alive) setIsFav(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, access, sourceId]);

  // Favourite toggle
  async function toggleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !sourceId) return;
    setFavLoading(true);
    try {
      if (isFav) {
        const res = await fetch(
          `${API_BASE}/favourites/${encodeURIComponent(sourceId)}/`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${access}` },
          }
        );
        if (res.ok || res.status === 204) setIsFav(false);
      } else {
        const res = await fetch(`${API_BASE}/favourites/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ movie_id: String(sourceId) }),
        });
        if (res.ok || res.status === 400 || res.status === 409) setIsFav(true);
      }
    } finally {
      setFavLoading(false);
    }
  }

  // Displayed 1–10 score: our average * 2, otherwise TMDB
  const displayVote10 = useMemo(() => {
    if (summary && summary.count > 0) {
      return Number((summary.avg * 2).toFixed(1));
    }
    return tmdbVote != null ? Number(tmdbVote.toFixed(1)) : null;
  }, [summary, tmdbVote]);

  const cast = topCast(movie?.credits, 3);
  const href = `/movie/${encodeURIComponent(sourceId)}`;

  return (
    <div className="snap-start">
      <Link to={href}>
        <Card className="w-44 min-w-[11rem] md:w-48 md:min-w-[12rem] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow">
          <div className="relative aspect-[2/3] bg-neutral-800">
            {poster ? (
              <img
                src={poster}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                No poster
              </div>
            )}

            {/* TOP RIGHT: favourite heart */}
            {user && (
              <button
                onClick={toggleFav}
                disabled={favLoading}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                title={isFav ? "Remove from favourites" : "Add to favourites"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${
                    isFav ? "text-red-400 fill-red-500" : "text-white"
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill={isFav ? "currentColor" : "none"}
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            )}

            {/* TOP LEFT: emoji badge */}
            <div
              className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
              title={
                summary && summary.count > 0
                  ? `Our average: ${(summary.avg * 2).toFixed(1)} / 10 (${summary.count} ratings)`
                  : `TMDB score: ${
                      tmdbVote != null ? tmdbVote.toFixed(1) : "–"
                    } / 10`
              }
            >
              <FaStar className="text-white text-xs" />
              <span className="tabular-nums">
                {ratingToEmoji(displayVote10)}
              </span>
            </div>
          </div>
          

          <div className="p-3">
            <div className="line-clamp-2 text-[13px] font-semibold text-neutral-100">
              {title}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">{year}</div>
            {cast && (
              <div className="mt-2 line-clamp-2 text-[11px] text-neutral-300/80">
                {cast}
              </div>
            )}
          </div>
        </Card>
      </Link>
    </div>
  );
}

function MovieCardSkeleton() {
  return (
    <div className="snap-start">
      <Card className="w-44 min-w-[11rem] md:w-48 md:min-w-[12rem] overflow-hidden">
        <Skeleton className="h-64 w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      </Card>
    </div>
  );
}

function MovieStrip({ title, subtitle, movieIds }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { elRef, scrollBy, onMouseDown, onMouseLeave, onMouseUp, onMouseMove } =
    useHorizontalScroll();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchMovies(movieIds);
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [movieIds?.join(",")]);

  return (
    <section className="relative">
      <div className="mb-3 flex items-baseline justify-between pr-12">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-100">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-neutral-400">{subtitle}</p>
          )}
        </div>
        <Badge>{movieIds.length} movies</Badge>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent" />

        <div className="flex items-center gap-3">
          <IconButton onClick={() => scrollBy(-480)} ariaLabel="Scroll left">
            <FaChevronLeft className="text-neutral-100" />
          </IconButton>

          <div
            ref={elRef}
            className="carousel no-scrollbar flex w-full gap-4 overflow-x-auto scroll-smooth py-2 snap-x snap-mandatory"
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
          >
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            {!loading && error && (
              <div className="p-4 text-sm text-red-400">
                Error while loading movies: {error}
              </div>
            )}
            {!loading &&
              !error &&
              data.map((m) => (
                <MovieCard key={m.id || Math.random()} movie={m} />
              ))}
          </div>

          <IconButton onClick={() => scrollBy(480)} ariaLabel="Scroll right">
            <FaChevronRight className="text-neutral-100" />
          </IconButton>
        </div>
      </div>
    </section>
  );
}

function PopularThisWeekStrip() {
  const [ids, setIds] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const list = await fetchTrendingMovieIds(10);
        if (alive) setIds(list);
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="relative">
        <div className="mb-3 flex items-baseline justify-between pr-12">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-100">
              Popular This Week
            </h2>
            <p className="text-sm text-neutral-400">
              Fresh weekly trends from TMDB
            </p>
          </div>
          <Badge>…</Badge>
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-red-400 text-sm">
        Could not fetch this week's popular movies: {err}
      </div>
    );
  }

  return <MovieStrip title="Popular This Week" movieIds={ids} />;
}

/**
 * ==========================
 *  FAVOURITES-BASED STRIP
 * ==========================
 */
function FavouriteBasedStrip() {
  const auth = useAuthOptional();
  const user = auth?.user;
  const access = auth?.access;

  console.log("FavouriteBasedStrip auth:", { user, access });

  const [state, setState] = useState({
    loading: true,
    ids: [],
    error: "",
    usedFallback: false,
  });

  useEffect(() => {
    let alive = true;

    // Consider the user "logged in" if we have either a user object OR an access token
    if (!user && !access) {
      // Not logged in at all -> simple fallback to static recommended
      setState({
        loading: false,
        ids: RECOMMENDED_IDS,
        error: "",
        usedFallback: true,
      });
      return;
    }

    (async () => {
      try {
        setState({ loading: true, ids: [], error: "", usedFallback: false });

        const favIds = await fetchUserFavouriteMovieIds(access);
        console.log(
          "FavouriteBasedStrip: favourite IDs from backend:",
          favIds
        );

        if (!favIds.length) {
          // Logged in but no favourites at all -> static fallback
          if (alive) {
            setState({
              loading: false,
              ids: RECOMMENDED_IDS,
              error: "",
              usedFallback: true,
            });
          }
          return;
        }

        const recIds = await buildRecommendationsFromFavourites(favIds);
        console.log(
          "FavouriteBasedStrip: built recommendations:",
          recIds
        );

        if (!recIds.length) {
          // TMDB-based recommendations failed – fallback: show the user's favourites themselves
          const numericFavIds = favIds
            .map((id) => toTmdbId(id))
            .filter((id) => id != null);

          const idsToUse =
            numericFavIds.length > 0
              ? numericFavIds.slice(0, 20)
              : RECOMMENDED_IDS;

          if (alive) {
            setState({
              loading: false,
              ids: idsToUse,
              error: "",
              usedFallback: !numericFavIds.length, // only mark as fallback if we had to use constants
            });
          }
          return;
        }

        if (alive) {
          setState({
            loading: false,
            ids: recIds,
            error: "",
            usedFallback: false,
          });
        }
      } catch (e) {
        if (alive) {
          setState({
            loading: false,
            ids: RECOMMENDED_IDS,
            error: String(e?.message || e),
            usedFallback: true,
          });
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id, access]);

  if (state.loading) {
    // Skeleton, so the section does not flicker
    return (
      <section className="relative">
        <div className="mb-3 flex items-baseline justify-between pr-12">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-100">
              Recommended For You
            </h2>
            <p className="text-sm text-neutral-400">
              Recommendation based on your favourites' genres, keywords,
              directors, and cast
            </p>
          </div>
          <Badge>…</Badge>
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const title = state.usedFallback ? "Recommended" : "Recommended For You";
  const subtitle = state.usedFallback
    ? "Currently this is a default section"
    : "Recommendation based on your favourites' genres, keywords, directors, and cast";

  return <MovieStrip title={title} subtitle={subtitle} movieIds={state.ids} />;
}

/**
 * ==========================
 *  PAGE
 * ==========================
 */
export default function FilmNerdHome() {
  const sections = useMemo(
    () => [
      { key: "friends-favorites", title: "Friends' Favorites", ids: FRIENDS_FAVORITES_IDS },
      { key: "admins-favorites", title: "Admin's Favorites", ids: ADMINS_FAVORITES_IDS },
    ],
    []
  );

  const [authOpen, setAuthOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-100">
                FilmNerd
              </h1>
            </div>
          </header>

          <main className="space-y-10">
            {tmdbApiKey ? (
              <>
                {/* New: favourites-based recommendation as the first section */}
                <FavouriteBasedStrip />

                {sections.map((s) => (
                  <MovieStrip
                    key={s.key}
                    title={s.title}
                    subtitle={s.subtitle}
                    movieIds={s.ids}
                  />
                ))}

                <PopularThisWeekStrip />
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-neutral-900 p-6 text-sm text-neutral-200">
                Missing TMDB API key (.env → <code>VITE_TMDB_API_KEY</code>). Add
                it and refresh the page.
              </div>
            )}
          </main>

          <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-neutral-500">
            © {new Date().getFullYear()} FilmNerd.
          </footer>
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .carousel.dragging { cursor: grabbing; }
          .carousel { cursor: grab; }
        `}</style>

        <AuthModal show={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </AuthProvider>
  );
}
