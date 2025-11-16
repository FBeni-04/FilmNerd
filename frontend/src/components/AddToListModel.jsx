import React, { useState, useEffect, useCallback } from 'react';
import { useAuthOptional } from "./AuthContext";
import { API_BASE } from '../lib/api';
import { FaMagnifyingGlass } from 'react-icons/fa6';

export default function AddToListModel({ show, onClose, movieId, onRequireLogin }) {
  const auth = useAuthOptional();
  const user = auth?.user;
  const access = auth?.access;
  
  // State for this modal
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for filtering lists
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for creating a new list
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Function to fetch the user's lists
  const fetchLists = useCallback(async () => {
    if (!access) return; 

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/lists/`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) throw new Error('Failed to fetch your lists');
      const data = await res.json();
      setLists(data.results || []); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [access]);

  useEffect(() => {
    if (show) {
      if (!user) {
        onRequireLogin();
        onClose();
      } else {
        fetchLists();
        setSearchTerm('');
        setNewListName('');
        setError('');
      }
    }
  }, [show, user, fetchLists, onRequireLogin, onClose]);

  // Function to create a new list (logic from MovieLists.jsx)
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setIsCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/lists/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ name: newListName }),
      });
      if (!res.ok) throw new Error('Failed to create list');
      
      setNewListName('');
      await fetchLists(); // Refresh the lists to show the new one
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Function to add the movie to a CHOSEN list
  const handleAddItemToList = async (listId) => {
    setError('');
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
         if (errData.error && errData.error.includes("already in the list")) {
           throw new Error("This movie is already in that list.");
         }
         throw new Error('Failed to add movie to list');
      }
      
      onClose(); // Success! Close the modal.

    } catch (err) {
      setError(err.message);
    }
  };

  // Filter lists based on search term
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 min-h-screen"
      aria-modal="true"
      role="dialog"
      onClick={onClose} // Close if clicking on the backdrop
    >
      <div 
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 shadow-xl"
        onClick={e => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-lg font-semibold text-white">Add to a List</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-neutral-300 hover:bg-white/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Search bar for lists */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 focus-within:ring-2 focus-within:ring-sky-500/40">
            <FaMagnifyingGlass className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-neutral-500"
              placeholder="Filter your lists..."
              aria-label="Filter your lists"
            />
          </div>

          {/* List of existing lists */}
          <div className="mt-4 max-h-48 space-y-2 overflow-auto border-t border-b border-white/10 py-2">
            {loading && <div className="px-2 py-1 text-sm text-neutral-400">Loading lists...</div>}
            {!loading && filteredLists.length === 0 && (
              <div className="px-2 py-1 text-sm text-neutral-400">No lists found.</div>
            )}
            {filteredLists.map(list => (
              <button
                key={list.id}
                onClick={() => handleAddItemToList(list.id)}
                className="block w-full rounded-md p-2 text-left text-neutral-200 hover:bg-sky-600/30"
              >
                <span className="font-medium">{list.name}</span>
                <span className="ml-2 text-xs text-neutral-400">
                  ({list.items.length} {list.items.length <= 1 ? 'Film' : 'Films'})
                </span>
              </button>
            ))}
          </div>
          
          {/* Create New List Form */}
          <form onSubmit={handleCreateList} className="mt-4">
            <label className="mb-1 block text-xs font-medium text-neutral-400">Or create a new list</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name"
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                disabled={isCreating}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-600 disabled:opacity-50"
                disabled={isCreating || !newListName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
          
          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    </div>
  );
}