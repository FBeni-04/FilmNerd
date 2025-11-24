// src/PublicProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  API_BASE,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFriends,
} from "./lib/api";
import AuthProvider from "./components/AuthContext";
import Navbar from "./components/Navbar";
import { MovieCard } from "./FilmNerdHome";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

async function fetchMovieDetails(movieId) {
  if (!TMDB_KEY) {
    console.warn("VITE_TMDB_API_KEY is missing from .env");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_KEY}&language=en-US&append_to_response=credits,keywords`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, _sourceId: movieId };
  } catch (error) {
    console.error("TMDB fetch error:", error);
    return null;
  }
}

function ratingToEmoji(r) {
  if (r >= 5) return "😍";
  if (r >= 4) return "🙂";
  if (r >= 3) return "😐";
  if (r >= 2) return "😕";
  return "😡";
}

export default function PublicProfilePage() {
  const { username } = useParams();

  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [favMovies, setFavMovies] = useState([]);
  const [watchlistMovies, setWatchlistMovies] = useState([]);
  const [reviewMovies, setReviewMovies] = useState([]);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access");

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);


  useEffect(() => {
    if (!username) {
      setError("No username provided.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const userRes = await fetch(`${API_BASE}/users/${username}/`, {
          headers: authHeaders,
        });
        if (!userRes.ok) {
          if (userRes.status === 404) throw new Error("User not found.");
          throw new Error("Failed to load user profile.");
        }
        const userData = await userRes.json();
        setUser(userData);

        const listsRes = await fetch(`${API_BASE}/users/${username}/lists/`, {
          headers: authHeaders,
        });
        const listsData = await listsRes.json();
        let listList = Array.isArray(listsData)
          ? listsData
          : listsData.results;
        if (!Array.isArray(listList)) listList = [];
        setLists(listList);

        const favRes = await fetch(
          `${API_BASE}/users/${username}/favourites/`,
          { headers: authHeaders }
        );
        const favData = await favRes.json();
        let favList = Array.isArray(favData) ? favData : favData.results;
        if (!Array.isArray(favList)) favList = [];
        setFavourites(favList);

        const watchRes = await fetch(
            `${API_BASE}/users/${username}/watchlist/`, 
            { headers: authHeaders }
        );
        const watchData = await watchRes.json();
        let watchList = Array.isArray(watchData) ? watchData : watchData.results;
        if (!Array.isArray(watchList)) watchList = [];
        setWatchlist(watchList);
        

        const revRes = await fetch(
          `${API_BASE}/users/${username}/reviews/`,
          { headers: authHeaders }
        );
        const revData = await revRes.json();
        let reviewList = Array.isArray(revData) ? revData : revData.results;
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
  }, [username, authHeaders]);

  useEffect(() => {
    if (!token) return;
    async function loadSocial() {
      try {
        const [followersData, followingData, friendsData] = await Promise.all([
          getFollowers({ token }),
          getFollowing({ token }),
          getFriends({ token }),
        ]);
        setFollowers(Array.isArray(followersData) ? followersData : []);
        setFollowing(Array.isArray(followingData) ? followingData : []);
        setFriends(Array.isArray(friendsData) ? friendsData : []);
      } catch (e) {
        console.warn(
          "Social endpoints unavailable on public profile:",
          e?.message || e
        );
      }
    }
    loadSocial();
  }, [token, authHeaders]);

  const myRecentReviews = useMemo(() => {
    return reviews
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [reviews]);

  useEffect(() => {
    async function loadFavMovies() {
      if (!favourites.length) {
        setFavMovies([]);
        return;
      }

      const results = await Promise.all(
        favourites.map(async (fav) => {
          const tmdb = await fetchMovieDetails(fav.movie_id);
          return tmdb || null;
        })
      );

      setFavMovies(results.filter(Boolean));
    }

    loadFavMovies();
  }, [favourites]);

  useEffect(() => {
    async function loadWatchlistMovies() {
      if (!watchlist.length) {
        setWatchlistMovies([]);
        return;
      }

      const results = await Promise.all(
        watchlist.map(async (w) => {
          const tmdb = await fetchMovieDetails(w.movie_id);
          return tmdb || null;
        })
      );

      setWatchlistMovies(results.filter(Boolean));
    }

    loadWatchlistMovies();
  }, [watchlist]);

  useEffect(() => {
    async function loadReviewMovies() {
      if (!myRecentReviews.length) {
        setReviewMovies([]);
        return;
      }

      const results = await Promise.all(
        myRecentReviews.map(async (rev) => {
          const tmdb = await fetchMovieDetails(rev.movie_id);
          if (!tmdb) return null;
          return {
            id: rev.id,
            rating: rev.rating,
            text: rev.text,
            created_at: rev.created_at,
            movie: tmdb,
          };
        })
      );

      setReviewMovies(results.filter(Boolean));
    }

    loadReviewMovies();
  }, [myRecentReviews]);

  const displayName =
    user?.name || user?.username || (username ? `@${username}` : "User");
  const initial = displayName[0]?.toUpperCase() || "?";

  const isFollowing =
    !!user && following.some((u) => u.username === user.username);
  const isFriend =
    !!user && friends.some((u) => u.username === user.username);

  async function handleToggleFollow() {
    if (!token || !user) return;
    try {
      if (isFollowing) {
        await unfollowUser({ token, userId: user.id });
      } else {
        await followUser({ token, username: user.username });
      }
      const [followersData, followingData, friendsData] = await Promise.all([
        getFollowers({ token }),
        getFollowing({ token }),
        getFriends({ token }),
      ]);
      setFollowers(Array.isArray(followersData) ? followersData : []);
      setFollowing(Array.isArray(followingData) ? followingData : []);
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (err) {
      alert(err.message || "Failed to update follow status");
    }
  }

  return (
    <AuthProvider>
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading && (
            <div className="text-neutral-100 p-8 text-center">Loading...</div>
          )}

          {!loading && error && (
            <div className="text-neutral-100 p-8 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-bold">
                    {initial}
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-neutral-100">
                      {displayName}
                    </h1>
                    {user?.username && (
                      <p className="text-sm text-neutral-400">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </div>
              </header>

              <main className="space-y-10">
                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Social
                  </h2>
                  {!token ? (
                    <p className="text-neutral-400 text-sm">
                      Sign in to follow this user.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                        <button
                          type="button"
                          onClick={handleToggleFollow}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            isFollowing
                              ? "bg-neutral-800 border border-white/20 text-neutral-100 hover:bg-neutral-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                        >
                          {isFollowing ? "Unfollow" : "Follow"}
                        </button>
                        {isFriend && (
                          <span className="text-xs text-emerald-400">
                            You are friends (mutual follow).
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                          <div className="text-xs text-neutral-400 mb-1">
                            Followers
                          </div>
                          <div className="text-xl font-semibold">
                            {followers.length}
                          </div>
                        </div>
                        <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                          <div className="text-xs text-neutral-400 mb-1">
                            Following
                          </div>
                          <div className="text-xl font-semibold">
                            {following.length}
                          </div>
                        </div>
                        <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                          <div className="text-xs text-neutral-400 mb-1">
                            Friends (mutual)
                          </div>
                          <div className="text-xl font-semibold">
                            {friends.length}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <div className="bg-neutral-900 p-4 rounded-xl border border-white/10 text-center">
                    <div className="text-xs text-neutral-400">Watchlist</div>
                    <div className="text-xl font-semibold">
                      {watchlist.length}
                    </div>
                  </div>
                </div>

                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Lists
                  </h2>

                  {lists.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      This user doesn't have any lists yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {lists.map((list) => (
                        <div
                          key={list.id}
                          className="block p-4 bg-neutral-900 rounded-lg border border-white/10"
                        >
                          <div className="flex justify-between">
                            <div className="font-semibold text-neutral-100">
                              {list.name}
                            </div>
                            <div className="text-sm text-neutral-400">
                              {list.items?.length || 0} movies
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Latest reviews
                  </h2>

                  {reviewMovies.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      This user hasn't written any reviews yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviewMovies.map((rev) => {
                        const movie = rev.movie;
                        const poster = movie?.poster_path
                          ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                          : null;
                        const title =
                          movie?.title ||
                          movie?.name ||
                          `TMDB #${movie?.id || rev.movie_id}`;
                        const year = movie?.release_date
                          ? movie.release_date.slice(0, 4)
                          : null;
                        const sourceId =
                          movie?._sourceId ?? movie?.id ?? rev.movie_id;

                        return (
                          <article
                            key={rev.id}
                            className="p-3 bg-neutral-900 rounded-lg border border-white/10 flex gap-3"
                          >
                            <Link
                              to={`/movie/${encodeURIComponent(sourceId)}`}
                              className="w-16 h-24 rounded-md overflow-hidden border border-white/10 flex-shrink-0 hover:border-emerald-400/70 transition-colors"
                            >
                              {poster ? (
                                <img
                                  src={poster}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 bg-neutral-950/60">
                                  No poster
                                </div>
                              )}
                            </Link>

                            <div className="flex-1">
                              <div className="flex justify_between items-start mb-1 gap-2">
                                <Link
                                  to={`/movie/${encodeURIComponent(sourceId)}`}
                                  className="text-sm text-neutral-100 font-semibold line-clamp-2 hover:text-white"
                                >
                                  {title}
                                  {year && (
                                    <span className="text-neutral-400">
                                      {" "}
                                      ({year})
                                    </span>
                                  )}
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
                        );
                      })}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Favourite movies
                  </h2>

                  {favourites.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      This user doesn't have any favourites yet.
                    </p>
                  ) : !favMovies.length ? (
                    <p className="text-neutral-400 text-sm">
                      Loading favourite movies...
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {favMovies.map((m) => (
                        <MovieCard key={m.id || m._sourceId} movie={m} />
                      ))}
                    </div>
                  )}
                </section>
                
                <section>
                  <h2 className="text-lg font-bold tracking-tight text-neutral-100 mb-3">
                    Watchlist
                  </h2>

                  {watchlist.length === 0 ? (
                    <p className="text-neutral-400 text-sm">
                      This user doesn't have any movies in their watchlist yet.
                    </p>
                  ) : !watchlistMovies.length ? (
                    <p className="text-neutral-400 text-sm">
                      Loading watchlist movies...
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {watchlistMovies.map((m) => (
                        <MovieCard key={m.id || m._sourceId} movie={m} />
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
