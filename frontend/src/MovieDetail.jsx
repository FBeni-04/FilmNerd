import React, { useEffect, useState, useMemo } from "react";
import { Star, Film } from "lucide-react";
<<<<<<< HEAD
import ReviewBox from "./components/ReviewBox";

=======
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = {
  w45:  (p) => `https://image.tmdb.org/t/p/w45${p}`,
  w92:  (p) => `https://image.tmdb.org/t/p/w92${p}`,
  w185: (p) => `https://image.tmdb.org/t/p/w185${p}`,
  w342: (p) => `https://image.tmdb.org/t/p/w342${p}`,
  w500: (p) => `https://image.tmdb.org/t/p/w500${p}`,
  w1280:(p) => `https://image.tmdb.org/t/p/w1280${p}`,
};

const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

// --- URL: „1359-american-psycho” → 1359 ---
export function parseMovieSlug(slug = "") {
  const m = String(slug).trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
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
          <a className="hover:text-white" href="/">Home</a>
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

// --- Videó-választó: HU→EN; Official; Trailer>Teaser; YouTube ---
function pickBestTrailer(videos, { preferLang = ["hu", "en"], preferType = ["Trailer", "Teaser"] } = {}) {
  const list = Array.isArray(videos) ? videos.filter(v => v.site === "YouTube") : [];
  if (!list.length) return null;

  const score = (v) => {
    const langIdx = preferLang.indexOf(String(v.iso_639_1 || "").toLowerCase());
    const typeIdx = preferType.indexOf(v.type || "");
    const official = v.official ? 1 : 0;
    // alacsonyabb jobb az indexnél, ezért invertálunk
    return [
      langIdx === -1 ? 99 : langIdx,
      typeIdx === -1 ? 99 : typeIdx,
      -official,
      // utolsóként a közelmúlt preferálása (pub dátum szerint)
      v.published_at ? -new Date(v.published_at).getTime() : 0,
    ];
  };

  return list
    .slice()
    .sort((a, b) => {
      const A = score(a), B = score(b);
      for (let i = 0; i < Math.max(A.length, B.length); i++) {
        if ((A[i] ?? 0) !== (B[i] ?? 0)) return (A[i] ?? 0) - (B[i] ?? 0);
      }
      return 0;
    })[0] || null;
}

export default function MovieDetail({ slug, movieId }) {
  const id = movieId ?? parseMovieSlug(slug);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTrailer, setShowTrailer] = useState(false);

  // --- API FETCH (videos + watch/providers is) ---
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!id) {
        setError("Hibás vagy hiányzó film azonosító.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const url =
          `${TMDB_BASE}/movie/${id}` +
          `?api_key=${tmdbApiKey}` +
          `&language=en-EN` +
          `&append_to_response=credits,release_dates,videos,watch/providers`;
        const res = await fetch(url);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`TMDB hiba: ${res.status} ${res.statusText} ${text}`);
        }

        const json = await res.json();
        if (alive) {
          setData(json);
          setShowTrailer(false); // reset when id changes
        }
      } catch (err) {
        if (alive) setError(err.message || String(err));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false };
  }, [id]);

  const backdrop = data?.backdrop_path ? TMDB_IMG.w1280(data.backdrop_path) : null;
  const poster   = data?.poster_path   ? TMDB_IMG.w500(data.poster_path) : null;
  
  const year = data?.release_date ? new Date(data.release_date).getFullYear() : "";
  const runtime = data?.runtime ? `${Math.floor(data.runtime/60)}ó ${data.runtime % 60}p` : "";
  const genres = (data?.genres || []).map(g => g.name).join(" • ");
  const rating = data?.vote_average ? data.vote_average.toFixed(1) : "–";

  // --- Trailer kiválasztása ---
  const trailer = useMemo(() => {
    const vids = data?.videos?.results || [];
    return pickBestTrailer(vids, { preferLang: ["hu", "en"] });
  }, [data]);

  // --- Watch providers (HU régió, US fallback) ---
  const providersHU = data?.["watch/providers"]?.results?.HU;
  const providersUS = data?.["watch/providers"]?.results?.US;
  const providers = providersHU || providersUS || null;

  const providerGroups = [
    { key: "flatrate", label: "Stream" },
    { key: "rent",     label: "Rent" },
    { key: "buy",      label: "Buy" },
  ];

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-200">
      <Navbar />

      {/* HERO / nagy banner */}
      <div className="relative mb-10 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          {backdrop ? (
            <img
              src={backdrop}
              alt=""
              className="h-[300px] w-full object-cover md:h-[300px]"
            />
          ) : (
            <div className="h-[420px] w-full bg-neutral-900 md:h-[520px]" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-neutral-950/75" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-24 pb-6 md:pt-40 md:pb-8" />
      </div>

      {/* FŐ TARTALOM */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14">
        {loading && <div className="text-neutral-400">Betöltés…</div>}
        {error && <div className="text-red-400">{error}</div>}

        {data && (
          <>
            <div className="flex flex-col gap-6 md:flex-row">
              {/* POSZTER */}
              <div>
                {poster ? (
                  <img src={poster} alt={data.title} className="w-56 md:w-64 rounded-lg border border-white/10" />
                ) : (
                  <div className="flex h-80 w-56 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 text-neutral-500">
                    Nincs poszter
                  </div>
                )}
              </div>

              {/* INFO BLOKK */}
              <div className="flex-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  {data.title} <span className="text-neutral-400">{year && `(${year})`}</span>
                </h1>

                {data.tagline && (
                  <p className="mt-1 text-neutral-400 italic">{data.tagline}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                  {runtime && <span>{runtime}</span>}
                  {genres && <span>• {genres}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-xs">
                    <Star size={12} /> <span className="tabular-nums">{rating}</span>
                  </span>
                </div>

                {data.overview && (
                  <p className="mt-4 max-w-3xl text-neutral-200/90">{data.overview}</p>
                )}

                {/* SZEREPLŐK */}
                <div className="mt-6">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                    Cast
                  </h2>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto py-1">
                    {(data.credits?.cast || []).slice(0, 5).map((p) => {
                      const photo = p.profile_path ? TMDB_IMG.w185(p.profile_path) : null;
                      return (
                        <div key={p.cast_id || p.credit_id} className="w-32 shrink-0">
                          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                            {photo ? (
                              <img src={photo} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                                Nincs kép
                              </div>
                            )}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[13px] font-medium text-neutral-100">
                            {p.name}
                          </div>
                          <div className="line-clamp-2 text-[11px] text-neutral-400">
                            {p.character}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* TRAILER */}
                {trailer && (
                  <div className="mt-6">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                      Trailer
                    </h2>

                    {!showTrailer ? (
                      <button
                        onClick={() => setShowTrailer(true)}
                        className="group relative block w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900"
                        aria-label="Trailer lejátszása"
                      >
                        {/* előnézet: backdrop/poster + play overlay */}
                        <div className="relative aspect-video w-full">
                          <img
                            src={backdrop || poster || ""}
                            alt=""
                            className="h-full w-full object-cover opacity-90"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/40">
                            <div className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm text-white backdrop-blur">
                              ▶ Lejátszás
                            </div>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10">
                        <iframe
                          src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                          title={trailer.name || "Trailer"}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          className="h-full w-full"
                        />
                      </div>
                    )}
                  </div>
                )}

<<<<<<< HEAD
            {data && <ReviewBox movieId={id} />}

=======
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
            {/* HOL NÉZHETŐ */}
            <div className="mt-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Where to watch
              </h2>

              {!providers ? (
                <div className="rounded-lg border border-white/10 bg-neutral-900/40 p-4 text-neutral-400">
                  Nincs elérhető adat a szolgáltatókról.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {providerGroups.map(({ key, label }) => {
                    const items = providers[key] || [];
                    if (!items.length) {
                      return (
                        <div key={key} className="rounded-lg border border-white/10 bg-neutral-900/40 p-4">
                          <div className="mb-2 text-sm font-medium text-neutral-200">{label}</div>
                          <div className="text-sm text-neutral-500">Nem elérhető.</div>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="rounded-lg border border-white/10 bg-neutral-900/40 p-4">
                        <div className="mb-3 text-sm font-medium text-neutral-200">{label}</div>
                        <div className="flex flex-wrap gap-2">
                          {items.map(p => (
                            <div
                              key={p.provider_id}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2 py-1"
                              title={p.provider_name}
                            >
                              {p.logo_path && (
                                <img
                                  src={TMDB_IMG.w92(p.logo_path)}
                                  alt={p.provider_name}
                                  className="h-5 w-5 rounded-sm object-contain"
                                  loading="lazy"
                                />
                              )}
                              <span className="text-xs text-neutral-200">{p.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 text-xs text-neutral-500">Source: TMDB</div>
            </div>
          </>
        )}
      </div>

      {/* helper stílus a vízszintes scrollhoz (ha kell) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
