// src/ProfilePage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "./lib/api";
import AuthProvider from "./components/AuthContext";
import Navbar from "./components/Navbar";

// --- TMDB API key + helper ---
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

async function fetchMovieDetails(movieId) {
  if (!TMDB_KEY) {
    console.warn("VITE_TMDB_API_KEY is missing from .env");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_KEY}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("TMDB fetch error:", error);
    return null;
  }
}

// Generate FilmNerd-style slug from title + TMDB id
function makeMovieSlug(title, tmdbId) {
  const base = (title || "").toString().toLowerCase().trim();
  const slugPart = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slugPart || "movie"}-${tmdbId}`;
}

// Rating → Emoji mapping (1–5)
function ratingToEmoji(r) {
  if (r >= 5) return "😍";
  if (r >= 4) return "🙂";
  if (r >= 3) return "😐";
  if (r >= 2) return "😕";
  return "😡";
}

export default function ProfilePage() {
  const [me, setMe] = useState(null);
  const [lists, setLists] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Favourites with TMDB details (poster, title, year, slug)
  const [favMovies, setFavMovies] = useState([]);
  // Own reviews with TMDB title/poster/slug
  const [reviewMovies, setReviewMovies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access");

  const authHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // ===============================
  // 1) Load user + base data
  // ===============================
  useEffect(() => {
    if (!token) {
      setError("You need to sign in to view your profile.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        // --- USER ---
        const meRes = await fetch(`${API_BASE}/auth/me/`, {
          headers: authHeaders,
        });
        if (!meRes.ok) {
          throw new Error("Failed to load your profile.");
        }
        const meData = await meRes.json();
        setMe(meData);

        // --- LISTS ---
        const listsRes = await fetch(`${API_BASE}/lists/`, {
          headers: authHeaders,
        });
        const listsData = await listsRes.json();
        let listList = Array.isArray(listsData)
          ? listsData
          : listsData.results;
        if (!Array.isArray(listList)) listList = [];
        setLists(listList);

        // --- FAVOURITES ---
        const favRes = await fetch(`${API_BASE}/favourites/`, {
          headers: authHeaders,
        });
        const favData = await favRes.json();
        let favList = Array.isArray(favData) ? favData : favData.results;
        if (!Array.isArray(favList)) favList = [];
        setFavourites(favList);

        // --- REVIEWS ---
        const revRes = await fetch(`${API_BASE}/reviews/`, {
          headers: authHeaders,
        });
        const revData = await revRes.json();
        let reviewList = Array.isArray(revData)
          ? revData
          : revData.results;
        if (!Array.isArray(reviewList)) reviewList = [];
        setReviews(reviewList);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unknown error occurred.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  // ===============================
  // 2) Own latest reviews (by user_id)
  // ===============================
  const myRecentReviews = useMemo(() => {
    if (!me) return [];
    return reviews
      .filter((r) => r.user_id === me.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [reviews, me]);

  // ===============================
  // 3) TMDB posters for favourites
  // ===============================
  useEffect(() => {
    async function loadFavPosters() {
      if (!favourites.length) {
        setFavMovies([]);
        return;
      }

      const results = await Promise.all(
        favourites.map(async (fav) => {
          const tmdb = await fetchMovieDetails(fav.movie_id);
          if (!tmdb) {
            return {
              movie_id: fav.movie_id,
              slug: `movie-${fav.movie_id}`,
              poster: null,
              title: `TMDB #${fav.movie_id}`,
              year: null,
            };
          }
          const title = tmdb.title || tmdb.name || `TMDB #${fav.movie_id}`;
          return {
            movie_id: fav.movie_id,
            slug: makeMovieSlug(title, fav.movie_id),
            poster: tmdb.poster_path
              ? `https://image.tmdb.org/t/p/w342${tmdb.poster_path}`
              : null,
            title,
            year: tmdb.release_date ? tmdb.release_date.slice(0, 4) : null,
          };
        })
      );

      setFavMovies(results);
    }

    loadFavPosters();
  }, [favourites]);

  // ===============================
  // 4) TMDB titles/posters for own latest reviews
  // ===============================
  useEffect(() => {
    async function loadReviewMovies() {
      if (!myRecentReviews.length) {
        setReviewMovies([]);
        return;
      }

      const results = await Promise.all(
        myRecentReviews.map(async (rev) => {
          const tmdb = await fetchMovieDetails(rev.movie_id);
          if (!tmdb) {
            return {
              id: rev.id,
              movie_id: rev.movie_id,
              slug: `movie-${rev.movie_id}`,
              title: `TMDB #${rev.movie_id}`,
              poster: null,
              rating: rev.rating,
              text: rev.text,
              created_at: rev.created_at,
            };
          }
          const title = tmdb.title || tmdb.name || `TMDB #${rev.movie_id}`;
          return {
            id: rev.id,
            movie_id: rev.movie_id,
            slug: makeMovieSlug(title, rev.movie_id),
            title,
            poster: tmdb.poster_path
              ? `https://image.tmdb.org/t/p/w342${tmdb.poster_path}`
              : null,
            rating: rev.rating,
            text: rev.text,
            created_at: rev.created_at,
          };
        })
      );

      setReviewMovies(results);
    }

    loadReviewMovies();
  }, [myRecentReviews]);

  const displayName = me?.name || me?.username || "Unknown user";
  const initial = displayName[0]?.toUpperCase() || "?";

  // ===============================
  // LAYOUT – same shell as FilmNerdHome
  // ===============================
  return (
    <AuthProvider>
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* STATE MESSAGES */}
          {loading && (
            <div className="text-neutral-100 p-8 text-center">
              Loading...
            </div>
          )}

          {!loading && error && (
            <div className="text-neutral-100 p-8 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && !token && (
            <div className="text-neutral-100 p-8 text-center">
              <h1 className="text-2xl font-semibold mb-4">Profile</h1>
              <p className="text-neutral-300">
                You need to sign in to view your profile.
              </p>
            </div>
          )}

          {!loading && !error && token && me && (
            <>
              {/* HEADER */}
              <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-bold">
                    {initial}
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-neutral-100">
                      {displayName}
                    </h1>
                    <p className="text-sm text-neutral-400">@{me.username}</p>
                  </div>
                </div>
              </header>

              <main className="space-y-10">
                {/* STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-xs text-neutral-400">Lists</div>
                    <div className="text-xl font-semibold">{lists.length}</div>
                  </div>
                  <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-xs text-neutral-400">Reviews</div>
                    <div className="text-xl font-semibold">
                      {reviewMovies.length}
                    </div>
                  </div>
                  <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-xs text-neutral-400">Favourites</div>
                    <div className="text-xl font-semibold">
                      {favourites.length}
                    </div>
                  </div>
                </div>

                {/* LISTS */}
                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Your lists
                  </h2>

                  {lists.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      You don't have any lists yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lists.map((list) => (
                        <Link
                          key={list.id}
                          to={`/list/${list.id}`}
                          className="block p-4 bg-neutral-900 rounded-lg border border-white/10 hover:border-emerald-400/70 hover:bg-neutral-900/80 transition-colors"
                        >
                          <div className="flex justify-between">
                            <div className="font-semibold text-neutral-100">
                              {list.name}
                            </div>
                            <div className="text-sm text-neutral-400">
                              {list.items?.length || 0} movies
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {/* OWN REVIEWS – POSTER + EMOJI, CLICKABLE */}
                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Your latest reviews
                  </h2>

                  {reviewMovies.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      You haven't written any reviews yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviewMovies.map((rev) => (
                        <article
                          key={rev.id}
                          className="p-3 bg-neutral-900 rounded-lg border border-white/10 flex gap-3"
                        >
                          {/* Poster as link */}
                          <Link
                            to={`/movie/${rev.slug}`}
                            className="w-16 h-24 rounded-md overflow-hidden border border-white/10 flex-shrink-0 hover:border-emerald-400/70 transition-colors"
                          >
                            {rev.poster ? (
                              <img
                                src={rev.poster}
                                alt={rev.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 bg-neutral-950/60">
                                No poster
                              </div>
                            )}
                          </Link>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <Link
                                to={`/movie/${rev.slug}`}
                                className="text-sm text-neutral-100 font-semibold line-clamp-2 hover:text-white"
                              >
                                {rev.title}
                              </Link>
                              <span className="text-2xl">
                                {ratingToEmoji(rev.rating)}
                              </span>
                            </div>

                            {rev.text && (
                              <p className="text-sm text-neutral-200 mb-1">
                                {rev.text}
                              </p>
                            )}

                            <p className="text-xs text-neutral-500">
                              {new Date(rev.created_at).toLocaleString()}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                {/* FAVOURITES – POSTER GRID, CLICKABLE */}
                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Your favourite movies
                  </h2>

                  {favourites.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      You don't have any favourites yet.
                    </p>
                  ) : !favMovies.length ? (
                    <p className="text-neutral-400 text-sm">
                      Loading favourite movies...
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {favMovies.map((m) => (
                        <Link
                          key={m.movie_id}
                          to={`/movie/${m.movie_id}`}
                          className="flex flex-col items-center gap-2 group"
                        >
                          {m.poster ? (
                            <img
                              src={m.poster}
                              alt={m.title}
                              className="rounded-lg border border-white/10 w-full group-hover:border-emerald-400/70 transition-colors"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] rounded-lg border border-dashed border-white/20 flex items-center justify-center text-xs text-neutral-500">
                              No poster
                            </div>
                          )}
                          <div className="text-sm text-center text-neutral-200 line-clamp-2 group-hover:text-white">
                            {m.title}
                            {m.year && (
                              <span className="text-neutral-400">
                                {" "}
                                ({m.year})
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </main>

              <footer className="mt-12 border-t border-white/10 pt-6 text-xs text-neutral-500">
                © {new Date().getFullYear()} FilmNerd.
              </footer>
            </>
          )}
        </div>
      </div>
    </AuthProvider>
  );
}
