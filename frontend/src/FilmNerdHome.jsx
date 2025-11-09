<<<<<<< HEAD
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBars, FaFilm, FaMagnifyingGlass, FaXmark, FaChevronLeft, FaChevronRight, FaStar } from "react-icons/fa6";
import Navbar from "./components/Navbar";
import SearchBox from "./components/SearchBox";
=======

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Film } from "lucide-react";

>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc

/**
 * ==========================
 *  CONFIG / CONSTANTS
 * ==========================
 */
// 10 fix, lokális TMDB ID – NINCS DB hívás
// Local shelves (TMDB IDs)
const RECOMMENDED_IDS = [238, 680, 550, 603, 27205, 155, 424, 278, 603692, 539];
const FRIENDS_FAVORITES_IDS = [603, 11, 1891, 122, 424, 807, 1892, 603692, 98, 24428];
const ADMINS_FAVORITES_IDS = [503919, 792307, 21484, 11167, 7452, 8321, 265195, 359940, 68718, 115];
const POPULAR_THIS_WEEK_IDS = [299536, 385128, 634649, 346698, 667538, 109445, 38142, 337404, 11, 284054];

<<<<<<< HEAD
// TMDB
=======

// --- TMDB kliens ---
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = {
  w92: (p) => `https://image.tmdb.org/t/p/w92${p}`,
  w185: (p) => `https://image.tmdb.org/t/p/w185${p}`,
  w342: (p) => `https://image.tmdb.org/t/p/w342${p}`,
};
const tmdbApiKey = (import.meta.env.VITE_TMDB_API_KEY || "").trim();

<<<<<<< HEAD
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
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${tmdbApiKey}&language=en-US&append_to_response=credits`;
=======
// -- ÚJ: backend sections
async function fetchSectionsFromDB() {
  let url = "/api/movies/";           // Vite proxy miatt relatív út!
  const ids = [];

  while (url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Movies fetch failed");
    const j = await r.json();

    const page = Array.isArray(j) ? j : (j.results || []);
    ids.push(...page.map(m => m.movie_id));

    // ha absolute a next (pl. http://127.0.0.1:8000/api/movies/?page=2), csupaszítsd le relatívra
    url = j.next ? j.next.replace(/^https?:\/\/[^/]+/, "") : null;
  }

  return [{
    key: "taste",
    title: "Popular this week",
    ids
  }, {
    key: "admin",
    title: "Admin's favorites",
    ids
  }, 
{
    key: "recommended",
    title: "Recommended for you",
    ids
  },
{
    key: "friends",
    title: "Popular with friends",
    ids
  }];
}




// -- Segéd: slugból numerikus TMDB id
const toTmdbId = (v) => {
  const m = String(v ?? "").match(/^\d+/);
  return m ? Number(m[0]) : null;
};

// -- TMDB fetch-ek: az eredeti ID-t is visszaadjuk, hogy a linkben slug maradhasson
const cache = new Map();
async function fetchMovie(sourceId) {
  const tmdbId = toTmdbId(sourceId);
  if (!tmdbId) throw new Error(`Érvénytelen ID: ${sourceId}`);

  const key = `movie:${tmdbId}`;
  if (cache.has(key)) return { ...cache.get(key), _sourceId: sourceId };

  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${tmdbApiKey}&language=en-EN&append_to_response=credits`;
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `TMDB error: ${res.status}`;
    try { const j = await res.json(); if (j?.status_message) msg += ` – ${j.status_message}`; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  cache.set(key, data);
  return { ...data, _sourceId: sourceId };
<<<<<<< HEAD
=======
}

async function fetchMovies(ids = []) {
  return Promise.all(
    ids
      .map((id) => ({ id, tmdbId: toTmdbId(id) }))
      .filter(({ tmdbId }) => tmdbId != null)
      .map(async ({ id }) => {
        try { return await fetchMovie(id); }
        catch (e) { return { id, _sourceId: id, error: String(e) }; }
      })
  );
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
}

async function fetchMovies(ids = []) {
  return Promise.all(
    ids
      .map((id) => ({ id, tmdbId: toTmdbId(id) }))
      .filter(({ tmdbId }) => tmdbId != null)
      .map(async ({ id }) => {
        try { return await fetchMovie(id); }
        catch (e) { return { id, _sourceId: id, error: String(e) }; }
      })
  );
}

async function fetchTrendingMovieIds(limit = 10) {
  const url = `${TMDB_BASE}/trending/movie/week?api_key=${tmdbApiKey}&language=hu-HU`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trending fetch failed (${res.status})`);
  const j = await res.json();
  return (j?.results || []).slice(0, limit).map(m => m.id);
}

/**
 * ==========================
 *  SMALL UTILS / HOOKS
 * ==========================
 */
const getYear = (s) => (s ? String(new Date(s).getFullYear()) : "");
const topCast = (credits, n = 3) => (credits?.cast || []).slice(0, n).map((p) => p.name).join(", ");

function useHorizontalScroll() {
  const elRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e) => {
    const el = elRef.current; if (!el) return;
    isDown.current = true; el.classList.add("dragging");
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
  };
  const onMouseLeave = () => { isDown.current = false; elRef.current?.classList.remove("dragging"); };
  const onMouseUp = () => { isDown.current = false; elRef.current?.classList.remove("dragging"); };
  const onMouseMove = (e) => {
    const el = elRef.current; if (!el || !isDown.current) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    el.scrollLeft = scrollLeft.current - walk;
  };
  const scrollBy = (offset) => { const el = elRef.current; if (!el) return; el.scrollBy({ left: offset, behavior: "smooth" }); };
  return { elRef, scrollBy, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
}

/**
 * ==========================
 *  UI BUILDING BLOCKS
 * ==========================
 */
function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-white/10 bg-neutral-900 shadow-sm ${className}`}>{children}</div>;
}
function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-neutral-200 ${className}`}>{children}</span>;
}

function IconButton({ children, onClick, ariaLabel }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-neutral-900/80 text-white backdrop-blur hover:bg-neutral-800/80 focus:outline-none"
    >
      {/* ha string jönne, ne torzuljon */}
      <span className="flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}

function Skeleton({ className = "" }) { return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />; }

function MovieCard({ movie }) {
  const poster = movie?.poster_path ? TMDB_IMG.w342(movie.poster_path) : null;
  const title = movie?.title || movie?.name || "Ismeretlen cím";
  const year  = getYear(movie?.release_date);
  const vote  = movie?.vote_average ? movie.vote_average.toFixed(1) : "–";
  const cast  = topCast(movie?.credits, 3);
<<<<<<< HEAD
  const href = `/movie/${encodeURIComponent(movie._sourceId ?? movie.id)}`;
  return (
    <div className="snap-start">
      <a href={href}>
        <Card className="w-44 min-w-[11rem] md:w-48 md:min-w-[12rem] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow">
          <div className="relative aspect-[2/3] bg-neutral-800">
            {poster ? (
              <img src={poster} alt={title} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">No poster</div>
            )}
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
              <FaStar className="text-white text-xs" />
              <span className="tabular-nums">{vote}</span>
            </div>
          </div>
          <div className="p-3">
            <div className="line-clamp-2 text-[13px] font-semibold text-neutral-100">{title}</div>
            <div className="mt-1 text-[11px] text-neutral-400">{year}</div>
            {cast && <div className="mt-2 line-clamp-2 text-[11px] text-neutral-300/80">{cast}</div>}
          </div>
        </Card>
=======

  const href = `/movie/${encodeURIComponent(movie._sourceId ?? movie.id)}`;

  return (
    <div className="snap-start">
      <a href={href}>
      <Card className="w-44 min-w-[11rem] md:w-48 md:min-w-[12rem] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow">
        <div className="relative aspect-[2/3] bg-neutral-800">
          {poster ? (
            <img src={poster} alt={title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">Nincs poszter</div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
            <Star size={12} className="opacity-90" />
            <span className="tabular-nums">{vote}</span>
          </div>
        </div>
        <div className="p-3">
          <div className="line-clamp-2 text-[13px] font-semibold text-neutral-100">{title}</div>
          <div className="mt-1 text-[11px] text-neutral-400">{year}</div>
          {cast && <div className="mt-2 line-clamp-2 text-[11px] text-neutral-300/80">{cast}</div>}
        </div>
      </Card>
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
      </a>
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
  const { elRef, scrollBy, onMouseDown, onMouseLeave, onMouseUp, onMouseMove } = useHorizontalScroll();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetchMovies(movieIds);
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [movieIds?.join(",")]);

  return (
    <section className="relative">
      <div className="mb-3 flex items-baseline justify-between pr-12">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-100">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-400">{subtitle}</p>}
        </div>
        <Badge>{movieIds.length} film</Badge>
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
            {loading && Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} />)}
            {!loading && error && <div className="p-4 text-sm text-red-400">Hiba történt: {error}</div>}
            {!loading && !error && data.map((m) => <MovieCard key={m.id || Math.random()} movie={m} />)}
          </div>

          <IconButton onClick={() => scrollBy(480)} ariaLabel="Scroll right"><FaChevronRight className="text-neutral-100" /></IconButton>
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
        setLoading(true); setErr("");
        const list = await fetchTrendingMovieIds(10); // vagy fetchPopularMovieIds(10)
        if (alive) setIds(list);
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <section className="relative">
        <div className="mb-3 flex items-baseline justify-between pr-12">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-100">Popular This Week</h2>
            <p className="text-sm text-neutral-400">Friss heti trendek a TMDB-ről</p>
          </div>
          <Badge>…</Badge>
        </div>
        <div className="flex gap-4">{Array.from({length: 8}).map((_,i)=><MovieCardSkeleton key={i}/>)}</div>
      </section>
    );
  }

  if (err) {
    return <div className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-red-400 text-sm">
      Nem sikerült lekérni a heti népszerűeket: {err}
    </div>;
  }

  return (
    <MovieStrip
      title="Popular This Week"
      movieIds={ids}
    />
  );
}



<<<<<<< HEAD

export default function FilmNerdHome() {
  const sections = useMemo(() => ([
    { key: "recommended",       title: "Recommended",        ids: RECOMMENDED_IDS },
    { key: "friends-favorites", title: "Friends' Favorites", ids: FRIENDS_FAVORITES_IDS },
    { key: "admins-favorites",  title: "Admin's Favorites",  ids: ADMINS_FAVORITES_IDS },
    // a "popular-week" most dinamikus külön komponenssel jön
  ]), []);
=======
export default function FilmNerdHome() {
  const [sections, setSections] = useState([])
  const [secErr, setSecErr] = useState("")
  const [secLoading, setSecLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setSecLoading(true)
        const s = await fetchSectionsFromDB()
        if (alive) setSections((s || []).filter(x => x?.ids?.length))
      } catch (e) {
        if (alive) setSecErr(String(e))
      } finally {
        if (alive) setSecLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-200">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-100">FilmNerd</h1>
          </div>
        </header>

        <main className="space-y-10">
          {tmdbApiKey ? (
            <>
              {sections.map(s => (
                <MovieStrip key={s.key} title={s.title} subtitle={s.subtitle} movieIds={s.ids} />
              ))}
              <PopularThisWeekStrip />
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-neutral-900 p-6 text-sm text-neutral-200">
              Missing TMDB API key (.env → <code>VITE_TMDB_API_KEY</code>). Add it and refresh the page.
            </div>
          )}
        </main>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-neutral-500">
<<<<<<< HEAD
          © {new Date().getFullYear()} FilmNerd.
=======
           © {new Date().getFullYear()} FilmNerd.
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
        </footer>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .carousel.dragging { cursor: grabbing; }
        .carousel { cursor: grab; }
      `}</style>
    </div>
  );
}
