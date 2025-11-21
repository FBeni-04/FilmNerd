  import React, { useEffect, useMemo, useState } from "react";
  import ReviewBox from "./components/ReviewBox";
  import AuthModal from "./components/AuthModal";
  import { useAuthOptional } from "./components/AuthContext";
  import AuthProvider from "./components/AuthContext";
  import { API_BASE } from "./lib/api";
  import { Link } from "react-router-dom";
  import Navbar from "./components/Navbar";
  import AddToListModel from "./components/AddToListModel";

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

  // --- „1359-american-psycho” → 1359 ---
  export function parseMovieSlug(slug = "") {
    const m = String(slug).trim().match(/^(\d+)/);
    return m ? Number(m[1]) : null;
  }

  // --- Videó-választó: HU→EN; Official; Trailer>Teaser; YouTube ---
  function pickBestTrailer(videos, { preferLang = ["hu", "en"], preferType = ["Trailer", "Teaser"] } = {}) {
    const list = Array.isArray(videos) ? videos.filter(v => v.site === "YouTube") : [];
    if (!list.length) return null;

    const score = (v) => {
      const langIdx = preferLang.indexOf(String(v.iso_639_1 || "").toLowerCase());
      const typeIdx = preferType.indexOf(v.type || "");
      const official = v.official ? 1 : 0;
      return [
        langIdx === -1 ? 99 : langIdx,
        typeIdx === -1 ? 99 : typeIdx,
        -official,
        v.published_at ? -new Date(v.published_at).getTime() : 0,
      ];
    };

    return list.slice().sort((a, b) => {
      const A = score(a), B = score(b);
      for (let i = 0; i < Math.max(A.length, B.length); i++) {
        if ((A[i] ?? 0) !== (B[i] ?? 0)) return (A[i] ?? 0) - (B[i] ?? 0);
      }
      return 0;
    })[0] || null;
  }



  // --- 1–10 skálán emoji ---
  function ratingToEmoji(num) {
    const n = Number(num);
    if (!isFinite(n) || n <= 2) return "😡";  // 1–2
    if (n <= 4) return "🙁";                  // 3–4
    if (n <= 6) return "😐";                  // 5–6
    if (n <= 8) return "🙂";                  // 7–8
    return "🤩";                              // 9–10
  }


  export default function MovieDetail({ slug, movieId }) {
    
    const id = movieId ?? parseMovieSlug(slug);
    const auth = useAuthOptional();
    const user = auth?.user;
    const access = auth?.access;
    console.log("AUTH DEBUG → user:", user, "access:", access);
    const [authOpen, setAuthOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showTrailer, setShowTrailer] = useState(false);

    const [addToListOpen, setAddToListOpen] = useState(false);

    // Saját review-összegzés (count, avg[1–5]) → ×2
    const [revSummary, setRevSummary] = useState(null);

    // Kedvenc állapot
    const [isFav, setIsFav] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    // --- TMDB fetch ---
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
          if (alive) { setData(json); setShowTrailer(false); }
        } catch (err) {
          if (alive) setError(err.message || String(err));
        } finally {
          if (alive) setLoading(false);
        }
      }
      load();
      return () => { alive = false; };
    }, [id]);

    // --- Saját értékelések összegzése ---
    useEffect(() => {
      let alive = true;
      if (!id) { setRevSummary(null); return; }
      (async () => {
        try {
          const r = await fetch(`${API_BASE}/reviews/summary/?movie_id=${encodeURIComponent(id)}`);
          if (!r.ok) { if (alive) setRevSummary(null); return; }
          const j = await r.json();
          if (alive) setRevSummary({ count: Number(j.count || 0), avg5: Number(j.avg || 0) }); // avg 1–5
        } catch {
          if (alive) setRevSummary(null);
        }
      })();
      return () => { alive = false; };
    }, [id]);

    // --- Kedvenc ellenőrzés (csak belépve van értelme) ---
    useEffect(() => {
      let alive = true;
      if (!user || !id) { setIsFav(false); return; }
      (async () => {
        try {
          const r = await fetch(`${API_BASE}/favourites/exists/?movie_id=${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${access}` },
          });
          const j = r.ok ? await r.json() : { exists: false };
          if (alive) setIsFav(Boolean(j.exists));
        } catch {
          if (alive) setIsFav(false);
        }
      })();
      return () => { alive = false; };
    }, [user?.id, access, id]);

    // Kedvenc toggle
    async function toggleFavourite() {
      if (!user) {
        setAuthOpen(true);
        return;
      }
      if (!id) return;
      setFavLoading(true);
      try {
        if (isFav) {
          const res = await fetch(`${API_BASE}/favourites/${encodeURIComponent(id)}/`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${access}` },
          });
          if (res.ok || res.status === 204) setIsFav(false);
        } else {
          const res = await fetch(`${API_BASE}/favourites/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access}`,
            },
            body: JSON.stringify({ movie_id: String(id) }),
          });
          if (res.ok || res.status === 400 || res.status === 409) setIsFav(true);
        }
      } finally {
        setFavLoading(false);
      }
    }

    // Megjelenítendő pontszám forrása:
    // ha van saját átlag (count>0): avg5 * 2 → 1–10; különben TMDB (1–10)
    const tmdbScore10 = data?.vote_average ?? null; // TMDB: 0–10
    const displayScore10 = useMemo(() => {
      if (revSummary && revSummary.count > 0) return Math.round((revSummary.avg5 * 2) * 10) / 10;
      return tmdbScore10 != null ? Math.round(tmdbScore10 * 10) / 10 : null;
    }, [revSummary, tmdbScore10]);

    const displayEmoji = ratingToEmoji(displayScore10);

    const backdrop = data?.backdrop_path ? TMDB_IMG.w1280(data.backdrop_path) : null;
    const poster   = data?.poster_path   ? TMDB_IMG.w500(data.poster_path) : null;

    const year = data?.release_date ? new Date(data.release_date).getFullYear() : "";
    const runtime = data?.runtime ? `${Math.floor(data.runtime/60)}ó ${data.runtime % 60}p` : "";
    const genres = (data?.genres || []).map(g => g.name).join(" • ");

    const trailer = useMemo(() => {
      const vids = data?.videos?.results || [];
      return pickBestTrailer(vids, { preferLang: ["hu", "en"] });
    }, [data]);

    // Watch providers (HU, US fallback)
    const providersHU = data?.["watch/providers"]?.results?.HU;
    const providersUS = data?.["watch/providers"]?.results?.US;
    const providers = providersHU || providersUS || null;

    const providerGroups = [
      { key: "flatrate", label: "Stream" },
      { key: "rent",     label: "Rent" },
      { key: "buy",      label: "Buy" },
    ];

    const directors = useMemo(() => {
      const crew = data?.credits?.crew || [];
      const dirs = crew.filter(c => c.job === "Director");
      const uniq = [];
      const seen = new Set();
      for (const d of dirs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          uniq.push(d);
        }
      }
      return uniq;
    }, [data]);

    return (
      <AuthProvider>
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />

        {/* HERO */}
        <div className="relative mb-10 overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 z-0">
            {backdrop ? (
              <img src={backdrop} alt="" className="h-[300px] w-full object-cover md:h-[300px]" />
            ) : (
              <div className="h-[420px] w-full bg-neutral-900 md:h-[520px]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-neutral-950/75" />
          </div>
          <div className="mx-auto max-w-7xl px-4 pt-24 pb-6 md:pt-40 md:pb-8" />
        </div>

        {/* CONTENT */}
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

                {/* INFO */}
                <div className="flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {data.title}{" "}
                      <span className="text-neutral-400">
                        {year && `(${year})`}
                      </span>
                    </h1>

                    {/* Kedvenc gomb */}

                      <button
                        onClick={toggleFavourite}
                        disabled={favLoading}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition
                          ${isFav
                            ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                            : "border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10"}`}
                        title={isFav ? "Delete Favourite" : "Add Favourite"}
                      >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 ${isFav ? "text-red-400 fill-red-500" : "text-neutral-200"}`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        fill={isFav ? "currentColor" : "none"}
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {isFav ? "Favourite" : "Add Favourite"}
                    
                      </button>
                      <button
                        onClick={() => {setAddToListOpen(true);}} // Open new model
                        className="iinline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition"
                      >
                        Add to List
                      </button>

                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                    {runtime && <span>{runtime}</span>}
                    {genres && <span>• {genres}</span>}

                    {/* Emoji badge + tooltip forrás magyarázattal */}
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-base"
                      title={
                        revSummary && revSummary.count > 0
                          ? `Saját átlag: ${(revSummary.avg5 * 2).toFixed(1)} / 10 (${revSummary.count} értékelés)`
                          : `TMDB pontszám: ${tmdbScore10 != null ? tmdbScore10.toFixed(1) : "nincs adat"} / 10`
                      }
                    >
                      {displayEmoji}
                      <span className="sr-only">
                        {displayScore10 != null ? `${displayScore10} / 10` : "nincs pontszám"}
                      </span>
                    </span>

                    {/* TMDB szám kijelzéséhez – ha továbbra is szeretnéd külön: */}
                    {/* <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-xs">
                      <Star size={12} /> <span className="tabular-nums">{tmdbScore10?.toFixed(1) ?? "–"}</span>
                    </span> */}
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
                          <Link
                            key={p.cast_id || p.credit_id || p.id}
                            to={`/actor/${p.id}`}
                            className="w-32 shrink-0 hover:-translate-y-1 hover:shadow-lg transition"
                          >
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
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                </div>
                  {/* Rendező(k) */}
                  {directors.length > 0 && (
                    <div className="mt-1 text-sm text-neutral-200">
                      <span className="font-semibold text-neutral-100">
                        Director{directors.length > 1 ? "s" : ""}:
                      </span>{" "}
                      {directors.map((d, idx) => (
                        <span key={d.id}>
                          {idx > 0 && ", "}
                          <Link
                            to={`/director/${d.id}`}
                            className="hover:underline hover:text-blue-300"
                          >
                          {d.name}
                          </Link>
                        </span>
                      ))}
                    </div>
                  )}

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

              {/* Reviews + Auth */}
              <ReviewBox movieId={id} onRequireLogin={() => setAuthOpen(true)} />
              <AuthModal show={authOpen} onClose={() => setAuthOpen(false)} />

              {/* Add to list modal */}
              <AddToListModel 
                show={addToListOpen} 
                onClose={() => setAddToListOpen(false)} 
                movieId={id} 
                onRequireLogin={() => {
                  setAddToListOpen(false); // Close this modal
                  setAuthOpen(true);      // Open the login modal
                }}
              />

              {/* WHERE TO WATCH */}
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
                    {[
                      { key: "flatrate", label: "Stream" },
                      { key: "rent",     label: "Rent" },
                      { key: "buy",      label: "Buy" },
                    ].map(({ key, label }) => {
                      const items = providers[key] || [];
                      if (!items.length) {
                        return (
                          <div key={key} className="rounded-lg border border-white/10 bg-neutral-900/40 p-4">
                            <div className="mb-2 text-sm font-medium text-neutral-200">{label}</div>
                            <div className="text-sm text-neutral-500">Not available.</div>
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

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
      </AuthProvider>
    );
  }
