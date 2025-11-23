import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthOptional } from "./components/AuthContext";
import { API_BASE } from './lib/api';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AuthProvider from './components/AuthContext';

export default function MovieLists() {
  const auth = useAuthOptional();
  const user = auth?.user;
  const access = auth?.access;
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);

  // Function to fetch the user's lists from the backend
  const fetchLists = useCallback(async () => {
    if (!access) return; 

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lists/`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch lists');
      }
      const data = await res.json();
      setLists(data.results || []); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [access]);

  // Fetch lists on component mount (if user is logged in)
  useEffect(() => {
    if (user) {
      fetchLists();
    }
  }, [user, fetchLists]); // Re-fetch if the access token changes

  // Function to handle creation of a new list
const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || !access) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/lists/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ name: newListName }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.name || 'Failed to create list');
      }

      setNewListName('');
      

      // We must 'await' the fetchLists() call to ensure
      // it completes before we set isCreating back to false.
      await fetchLists(); 
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Function to handle deletion of a list
  const handleDeleteList = async (listId, listName) => {
    if (!access) return;

    // Optional: Add a confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the list "${listName}"?`)) {
      return;
    }

    setIsDeleting(true); // Indicate deletion is in progress
    setError(''); // Clear any previous errors

    try {
      const res = await fetch(`${API_BASE}/lists/${listId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete list');
      }

      // If successful, re-fetch the lists to update the UI
      await fetchLists();

    } catch (err) {
      setError(`Error deleting list: ${err.message}`);
    } finally {
      setIsDeleting(false); // Reset deletion status
    }
  };

  // Render a login prompt if the user is not logged in
  if (!user) {
    return (
      <div className="min-h-dvh bg-neutral-950 text-neutral-200">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-white">My Lists</h1>
          <p className="mt-4 text-neutral-400">
            Please{' '}
            {/* --- 3. Change this to use local state --- */}
            <button onClick={() => setAuthOpen(true)} className="text-sky-400 underline hover:text-sky-300">
              Login
            </button>{' '}
            to create and view your movie lists.
          </p>
        </div>
        <AuthModal show={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  // Main component render for logged-in users
  return (
    <AuthProvider>
    <div className="min-h-dvh bg-neutral-950 text-neutral-200">
      <Navbar />
      <AuthModal show={authOpen} onClose={() => setAuthOpen(false)}/>
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-white">My Movie Lists</h1>
        </div>

        {/* --- Create New List Form --- */}
        <form onSubmit={handleCreateList} className="mt-8">
          <h2 className="text-lg font-semibold text-white">Create a New List</h2>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., 'My Sci-Fi Favourites'"
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white placeholder-neutral-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              disabled={isCreating}
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
              disabled={isCreating || !newListName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        {/* --- Display Existing Lists --- */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">Your Lists</h2>
          {loading && <p className="mt-4 text-neutral-400">Loading your lists...</p>}
          {!loading && lists.length === 0 && (
            <p className="mt-4 text-neutral-400">You haven't created any lists yet.</p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              // Wrap the div in a Link component
              <div key={list.id} className="relative">
              <Link
                to={`/list/${list.id}`} // Link to the new detail page
                className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition hover:bg-neutral-800/60"
              >
                <h3 className="text-lg font-semibold text-sky-400">{list.name}</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {list.items.length} {list.items.length <= 1 ? 'Film' : 'Films'}
                </p>
              </Link>
              <button
                  onClick={(e) => {
                    e.preventDefault(); // Prevent Link from triggering
                    e.stopPropagation(); // Stop event bubbling
                    handleDeleteList(list.id, list.name);
                  }}
                  className="absolute top-4 right-4 z-10 text-red-400 hover:text-red-600"
                  title={`Delete list "${list.name}"`}
                  disabled={isDeleting} // Disable button while deletion is in progress
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </AuthProvider>
  );
}