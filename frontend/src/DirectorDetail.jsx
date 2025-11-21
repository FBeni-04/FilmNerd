// DirectorDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthProvider from "./components/AuthContext";

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

// „578-ridley-scott” → 578 (fallback, ha egyszer slugot használsz)
export function parsePersonSlug(slug = "") {
  const m = String(slug).trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

export default function DirectorDetail({ slug, personId }) {
  const params = useParams();
  // 1) elsődleges: route param (/director/:id)
  // 2) ha nincs: propban kapott personId
  // 3) ha az sincs: slugból kibányászva az ID
  const routeId = params?.id ? Number(params.id) : null;
  const id = routeId ?? personId ?? parsePersonSlug(slug);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) {
        setError("Hibás vagy hiányzó rendező azonosító.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const url =
          `${TMDB_BASE}/person/${id}` +
          `?api_key=${tmdbApiKey}` +
          `&language=en-EN` +
          `&append_to_response=combined_credits`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`TMDB hiba: ${res.status} ${res.statusText} ${text}`);
        }
        const json = await res.json();
        if (alive) setData(json);
      } catch (err) {
        if (alive) setError(err.message || String(err));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const profile = data?.profile_path ? TMDB_IMG.w500(data.profile_path) : null;

  const birthday = data?.birthday ? new Date(data.birthday) : null;
  const deathday = data?.deathday ? new Date(data.deathday) : null;

  const birthYear = birthday ? birthday.getFullYear() : null;
  const deathYear = deathday ? deathday.getFullYear() : null;

  const ageText = useMemo(() => {
    if (!birthday) return "";
    const now = deathday || new Date();
    const age =
      now.getFullYear() -
      birthday.getFullYear() -
      (now.getMonth() < birthday.getMonth() ||
      (now.getMonth() === birthday.getMonth() && now.getDate() < birthday.getDate())
        ? 1
        : 0);
    if (deathday) {
      return `${age} years old at death`;
    }
    return `${age} years old`;
  }, [birthday, deathday]);

  const topDirectedCredits = useMemo(() => {
    let crew = data?.combined_credits?.crew || [];
    if (!crew.length) return [];

    crew = crew.filter(
        (c) =>
        c.job === "Director" ||
        c.department === "Directing"
    );
    crew = crew.filter(
        (c) => c.media_type === "movie" || !c.media_type
    );

    crew = crew.filter((c) => (c.vote_count || 0) >= 50);

    return crew
        .slice()
        .sort((a, b) => {
        const av = a.vote_average || 0;
        const bv = b.vote_average || 0;
        if (bv !== av) return bv - av;                 // 1) legjobb átlag
        const ac = a.vote_count || 0;
        const bc = b.vote_count || 0;
        if (bc !== ac) return bc - ac;                 // 2) több szavazat előrébb
        return (b.popularity || 0) - (a.popularity || 0); // 3) tie-breaker: popularity
        })
        .slice(0, 10);
    }, [data]);


  return (
    <AuthProvider>
    <div className="min-h-dvh bg-neutral-950 text-neutral-200">
      <Navbar />

      {/* CONTENT */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 pt-24">
        {loading && <div className="text-neutral-400">Betöltés…</div>}
        {error && <div className="text-red-400">{error}</div>}

        {data && (
          <>
            <div className="flex flex-col gap-6 md:flex-row">
              {/* PORTRÉ */}
              <div>
                {profile ? (
                  <img
                    src={profile}
                    alt={data.name}
                    className="w-56 md:w-64 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-80 w-56 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 text-neutral-500">
                    Nincs portré
                  </div>
                )}
              </div>

              {/* INFO */}
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {data.name}
                  {(birthYear || deathYear) && (
                    <span className="ml-2 text-neutral-400 text-lg">
                      {birthYear}
                      {deathYear ? ` – ${deathYear}` : ""}
                    </span>
                  )}
                </h1>

                <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-300">
                  {data.known_for_department && (
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1">
                      Known for: {data.known_for_department}
                    </span>
                  )}
                  {data.place_of_birth && (
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1">
                      Born in: {data.place_of_birth}
                    </span>
                  )}
                  {birthday && (
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1">
                      Born: {data.birthday}
                    </span>
                  )}
                  {deathday && (
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1">
                      Died: {data.deathday}
                    </span>
                  )}
                  {ageText && !deathday && (
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1">
                      {ageText}
                    </span>
                  )}
                </div>

                {data.biography && (
                  <p className="mt-4 max-w-3xl text-neutral-200/90 whitespace-pre-line">
                    {data.biography}
                  </p>
                )}
              </div>
            </div>

            {/* LEGNÉPSZERŰBB FILMEK RENDEZŐKÉNT – popularity szerinti TOP, kattintható */}
            <div className="mt-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Most popular movies (directing)
              </h2>

              {topDirectedCredits.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-neutral-900/40 p-4 text-neutral-400">
                  Nincs elérhető rendezői adat.
                </div>
              ) : (
                <div className="no-scrollbar flex gap-4 overflow-x-auto py-2">
                  {topDirectedCredits.map((m) => {
                    const poster = m.poster_path
                      ? TMDB_IMG.w185(m.poster_path)
                      : null;
                    const year = m.release_date
                      ? new Date(m.release_date).getFullYear()
                      : "";
                    return (
                      <Link
                        key={`${m.credit_id || m.id}-directing`}
                        to={`/movie/${m.id}`}
                        className="w-32 shrink-0 hover:-translate-y-1 hover:shadow-lg transition"
                      >
                        <div className="aspect-[2/3] overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                          {poster ? (
                            <img
                              src={poster}
                              alt={m.title || m.original_title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                              Nincs poszter
                            </div>
                          )}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[13px] font-medium text-neutral-100">
                          {m.title || m.original_title}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {year}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
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
