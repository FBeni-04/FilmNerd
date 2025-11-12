import React, { useState } from "react";
import { FaBars, FaFilm } from "react-icons/fa6";
import SearchBox from "./SearchBox";
import AuthModal from "./AuthModal";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3">

        <div className="flex items-center">

          {/* BAL oldal */}
          <div className="flex items-center gap-2 text-neutral-100">
            <button
              type="button"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-neutral-900/80 text-white"
              onClick={() => setOpen(!open)}
            >
              <FaBars className="h-5 w-5" />
            </button>
            <FaFilm className="h-5 w-5" />
            <span className="text-lg font-extrabold tracking-tight">FilmNerd</span>
          </div>

          {/* KÖZÉP */}
          <nav className="hidden md:flex gap-6 text-sm text-neutral-300 mx-auto">
            

            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <Link to="/lists" className="hover:text-white">Lists</Link>
            <a className="hover:text-white" href="#">Search</a>
            <a className="hover:text-white" href="#">Profile</a>
          </nav>

          {/* JOBB oldal: Search + Auth */}
          <div className="hidden md:flex items-center gap-4 md:ml-auto md:pl-4">
            <SearchBox />

            {user ? (
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="text-neutral-200">Hi, {user.username}</span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg border border-white/20 px-3 py-1 text-neutral-200 hover:bg-white/10"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* MOBIL MENÜ */}
        {open && (
          <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-xl md:hidden">
            <nav className="grid gap-2 text-sm">
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Home</a>
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Lists</a>
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Search</a>

              {user ? (
                <button
                  onClick={logout}
                  className="rounded px-3 py-2 text-left hover:bg-white/5"
                >
                  Kilépés
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); setAuthOpen(true); }}
                  className="rounded px-3 py-2 text-left hover:bg-white/5"
                >
                  Belépés
                </button>
              )}
            </nav>

            <div className="border-t border-white/10 pt-2">
              <SearchBox />
            </div>
          </div>
        )}
      </div>

      <AuthModal show={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
