/*
FilmNerd – Letterboxd-szerű dark témás UI + carousel-strip + template navbar
- Dark háttér, pasztell szöveg, poszter-fókusz
- Scroll-snap alapú vízszintes "carousel" sávok bal/jobb gombokkal
- Drag-to-scroll (egér lenyomva húzás), touch támogatás
- Minimal dependency: React (+ Tailwind ajánlott), lucide-react opcionális
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Film } from "lucide-react"; // ha nincs lucide: cseréld ★, ‹, ›, 🎬 karakterekre

// --- Ideiglenes film-azonosítók (helykitöltő listák) ---
const RECOMMENDED_IDS = [238, 550, 680, 155, 424];
const POPULAR_WITH_FRIENDS_IDS = [603, 744, 1891, 807, 13];
const ADMIN_FAVORITES_IDS = [497, 24428, 429, 27205, 122];
const SAME_TASTES_IDS = [1124, 78, 920, 807, 429617];

// --- TMDB kliens ---
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = { w342: (p) => `https://image.tmdb.org/t/p/w342${p}` };
const tmdbApiKey = (import.meta.env.VITE_TMDB_API_KEY || "").trim();

const cache = new Map();
async function fetchMovie(id) {
  const key = `movie:${id}`;
  if (cache.has(key)) return cache.get(key);
  const url = `${TMDB_BASE}/movie/${id}?api_key=${tmdbApiKey}&language=hu-HU&append_to_response=credits`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `TMDB hiba: ${res.status}`;
    try { const j = await res.json(); if (j?.status_message) msg += ` – ${j.status_message}`; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  cache.set(key, data);
  return data;
}
async function fetchMovies(ids = []) {
  return Promise.all(ids.map(async (id) => { try { return await fetchMovie(id); } catch (e) { return { id, error: String(e) }; } }));
}

// --- Segédek ---
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
    const walk = (x - startX.current) * 1.2; // érzékenység
    el.scrollLeft = scrollLeft.current - walk;
  };

  const scrollBy = (offset) => { const el = elRef.current; if (!el) return; el.scrollBy({ left: offset, behavior: "smooth" }); };

  return { elRef, scrollBy, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
}

// --- UI alap elemek ---
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
      {children}
    </button>
  );
}

function Skeleton({ className = "" }) { return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />; }

function MovieCard({ movie }) {
  const poster = movie?.poster_path ? TMDB_IMG.w342(movie.poster_path) : null;
  const title = movie?.title || movie?.name || "Ismeretlen cím";
  const year = getYear(movie?.release_date);
  const vote = movie?.vote_average ? movie.vote_average.toFixed(1) : "–";
  const cast = topCast(movie?.credits, 3);

  return (
    <div className="snap-start">
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
        {/* szélek elhalványítása */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent" />

        <div className="flex items-center gap-3">
          <IconButton onClick={() => scrollBy(-480)} ariaLabel="Görgess balra">
            <ChevronLeft size={16} />
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

          <IconButton onClick={() => scrollBy(480)} ariaLabel="Görgess jobbra"><ChevronRight size={16} /></IconButton>
        </div>
      </div>
    </section>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-neutral-100">
          <Film size={18} className="opacity-90" />
          <span className="text-lg font-extrabold tracking-tight">FilmNerd</span>
        </div>
        <nav className="hidden gap-6 text-sm text-neutral-300 md:flex">
          <a className="hover:text-white" href="#">Home</a>
          <a className="hover:text-white" href="#">Lists</a>
          <a className="hover:text-white" href="#">Search</a>
          <a className="hover:text-white" href="#">Profil</a>
        </nav>
        <div className="ml-4 hidden md:block">
          <input
            className="w-56 rounded-full border border-white/10 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Film, rendező, színész…"
          />
        </div>
      </div>
    </header>
  );
}

export default function FilmNerdHome() {
  const sections = useMemo(() => ([
    { key: "rec", title: "For you", ids: RECOMMENDED_IDS },
    { key: "friends", title: "Popular with friends", ids: POPULAR_WITH_FRIENDS_IDS },
    { key: "admin", title: "Admins' favourite", ids: ADMIN_FAVORITES_IDS },
    { key: "taste", title: "Popular this week", ids: SAME_TASTES_IDS }
  ]), []);

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
            sections.map((s) => (
              <MovieStrip key={s.key} title={s.title} subtitle={s.subtitle} movieIds={s.ids} />
            ))
          ) : (
            <div className="rounded-xl border border-white/10 bg-neutral-900 p-6 text-sm text-neutral-200">
              Hiányzik a TMDB API kulcs (.env → <code>VITE_TMDB_API_KEY</code>). Add meg, majd frissítsd az oldalt.
            </div>
          )}
        </main>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-neutral-500">
          TMDB adatforrás – © {new Date().getFullYear()} FilmNerd.
        </footer>
      </div>

      {/* no-scrollbar + drag vizuális segédstílus */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .carousel.dragging { cursor: grabbing; }
        .carousel { cursor: grab; }
      `}</style>
    </div>
  );
}
