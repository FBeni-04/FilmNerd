import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import { API_BASE } from './lib/api';
import Navbar from './components//Navbar';
import AuthModal from './components/AuthModal';
import SearchBox from './components/SearchBox';

// This is a minimal TMDB API fetcher for getting movie details
// We'll need this to show posters and titles for the movie_ids
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_W185 = (p) => `https://image.tmdb.org/t/p/w500${p}`;
const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

// Fetches details for a single movie from TMDB
const fetchMovieData = async (movieId) => {
  const url = `${TMDB_BASE}/movie/${movieId}?api_key=${tmdbApiKey}&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      title: data.title,
      poster: data.poster_path ? TMDB_IMG_W185(data.poster_path) : null,
      slug: `${data.id}-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    };
  } catch {
    return null;
  }
};


export default function MovieListDetail() {
  const { listId } = useParams(); // Get the list ID from the URL
  const { user, access, showLogin } = useAuth();
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]); // State to hold movie details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(''); // Separate error for the add box

  // Fetches the list details AND the details for each movie in it
  const fetchListDetails = useCallback(async () => {
    if (!access || !listId) return;

    setLoading(true);
    setError('');
    try {
      // 1. Fetch the list details (name, etc.)
      const listRes = await fetch(`${API_BASE}/lists/${listId}/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!listRes.ok) {
        throw new Error('Failed to fetch list. You may not be the owner.');
      }
      const listData = await listRes.json();
      setList(listData);

      // 2. Fetch TMDB data for each item in the list
      const movieDataPromises = listData.items.map(item => fetchMovieData(item.movie_id));
      const movieData = (await Promise.all(movieDataPromises)).filter(Boolean); // Filter out any failed fetches
      setItems(movieData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [access, listId]);

  // Fetch data when the component mounts or auth/listId changes
  useEffect(() => {
    if (user) {
      fetchListDetails();
    }
  }, [user, fetchListDetails]);

  // Function to remove a movie from the list
  const handleRemoveItem = async (movieId) => {
    if (!access) return;

    // Optimistically remove from UI
    setItems(prevItems => prevItems.filter(item => item.id !== movieId));

    try {
      const res = await fetch(`${API_BASE}/lists/${listId}/items/${movieId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      if (!res.ok) {
        // If delete fails, refresh data from server to revert UI
        setError('Failed to remove item. Refreshing...');
        fetchListDetails();
      }
    } catch (err) {
      setError('An error occurred. Refreshing...');
      fetchListDetails();
    }
  };

  //Function to add a movie to the list
  const handleAddItem = async (movieId) => {
    if (!access || !listId || !movieId) return;

    setIsAdding(true);
    setAddError(''); // Clear previous add errors

    try {
      const res = await fetch(`${API_BASE}/lists/${listId}/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ movie_id: String(movieId) }),
      });

      if (!res.ok) {
        const errData = await res.json();
        // Handle the "already in list" error from our backend
        if (errData.error && errData.error.includes("already in the list")) {
          setAddError("This movie is already in the list.");
        } else {
          throw new Error(errData.detail || 'Failed to add item');
        }
      } else {
        // Success! Refresh the list to show the new item
        await fetchListDetails();
      }

    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-10 text-center">
          <p className="mt-4 text-neutral-400">
            Please <b>Login</b> to create and view your movie lists.
          </p>
        </div>
        <AuthModal />
      </div>
    );
  }

return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-200">
      <Navbar />
      <AuthModal />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {loading && <p className="text-neutral-400">Loading list...</p>}
        {error && <p className="text-red-400">{error}</p>}
        
        {list && (
          <>
            <h1 className="text-3xl font-extrabold text-white">{list.name}</h1>
            
            {/* --- 4. Add the SearchBox and error display --- */}
            <div className="mt-8 max-w-md">
              <h2 className="mb-2 text-sm font-semibold text-neutral-300">Add a film to this list</h2>
              {/* Pass the handleAddItem function to onSelect */}
              <SearchBox onSelect={(movieId) => handleAddItem(movieId)} />
              {isAdding && <p className="mt-2 text-sm text-sky-400">Adding movie...</p>}
              {addError && <p className="mt-2 text-sm text-yellow-400">{addError}</p>}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map(movie => (
                <div key={movie.id} className="group relative">
                  <Link to={`/movie/${movie.slug}`}>
                    <div className="aspect-[2/3] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition group-hover:border-sky-400/50">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-xs text-neutral-500">
                          {movie.title}
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemoveItem(movie.id)}
                    className="absolute top-1 right-1  "
                    title="Remove from list"
                  >
                    &times;
                  </button>
                  <h3 className="mt-2 text-sm font-medium text-neutral-100 truncate">{movie.title}</h3>
                </div>
              ))}
            </div>

            {!loading && items.length === 0 && (
              <p className="mt-4 text-neutral-400">This list is empty. Add some movies!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}