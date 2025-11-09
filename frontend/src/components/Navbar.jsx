import React, { useState } from "react";
import { FaBars, FaFilm } from "react-icons/fa6";
import SearchBox from "./SearchBox";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3">

        {/* Felső sor: BAL | KÖZÉP | JOBB */}
        <div className="flex items-center">

          {/* BAL oldal */}
          <div className="flex items-center gap-2 text-neutral-100">
            <button
              type="button"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-neutral-900/80 text-white"
              onClick={() => setOpen(v => !v)}
              aria-label="Menu"
            >
              <FaBars className="h-5 w-5" />
            </button>
            <FaFilm className="h-5 w-5" />
            <span className="text-lg font-extrabold tracking-tight">FilmNerd</span>
          </div>

          {/* KÖZÉP – a menü középre igazítva */}
          <nav className="hidden md:flex gap-6 text-sm text-neutral-300 mx-auto">
            <a className="hover:text-white" href="#">Home</a>
            <a className="hover:text-white" href="#">Lists</a>
            <a className="hover:text-white" href="#">Search</a>
            <a className="hover:text-white" href="#">Profile</a>
          </nav>

          {/* JOBB oldal – SearchBox */}
          <div className="hidden md:block md:ml-auto md:pl-4">
            <SearchBox />
          </div>

        </div>

        {/* MOBIL menü */}
        {open && (
          <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-xl md:hidden">
            <nav className="grid gap-2 text-sm">
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Home</a>
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Lists</a>
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Search</a>
              <a className="rounded px-3 py-2 hover:bg-white/5" href="#">Profile</a>
            </nav>
            <div className="border-t border-white/10 pt-2">
              <SearchBox />
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
