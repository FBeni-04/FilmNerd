
import React, { useEffect, useMemo, useState } from "react";
import EmojiRating from "./EmojiRating";
import { API_BASE } from "../lib/api";
import { useAuthOptional } from "./AuthContext";

function ReviewsBoxAuthed({ movieId, user, access, onRequireLogin }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [avg, setAvg] = useState({ count: 0, avg: 0 });
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE}/reviews/?movie_id=${movieId}`),
        fetch(`${API_BASE}/reviews/summary/?movie_id=${movieId}`),
      ]);
      if (!r1.ok) throw new Error("Nem sikerült lekérni a véleményeket.");
      if (!r2.ok) throw new Error("Nem sikerült lekérni az összegzést.");
      const data = await r1.json();
      const summary = await r2.json();
      const rows = data.results ?? data;
      setList(rows);
      setAvg(summary);

      // Saját korábbi értékelés visszatöltése
      if (user?.id) {
        const mine = rows.find(x => x.user_id === user.id);
        setRating(mine?.rating ?? 0);
        setText(mine?.text ?? "");
      } else {
        setRating(0);
        setText("");
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (movieId) load();
  }, [movieId, user?.id]);

  async function save() {
    if (!user || !access) {
      setError("Be kell jelentkezni az értékeléshez.");
      onRequireLogin?.();
      return;
    }
    if (!rating) {
      setError("Válassz értékelést!");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          movie_id: String(movieId),
          rating: Number(rating),
          text: text?.trim() || null,
        }),
      });

      if (res.status === 401) {
        setError("Be kell jelentkezni az értékeléshez.");
        onRequireLogin?.();
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Mentési hiba: ${res.status} ${t}`);
      }
      await load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  const stars = useMemo(() => {
    const x = Math.round((avg.avg || 0) * 2) / 2;
    const full = Math.floor(x);
    const half = x - full >= 0.5;
    return { full, half };
  }, [avg]);

  return (
    <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Reviews
        </h2>
        <div className="text-sm text-neutral-300">
          Score: <span className="font-semibold">{avg.avg || 0}</span> / 5
          <span className="ml-2 text-neutral-500">({avg.count} review)</span>
        </div>
      </div>

      {/* saját értékelés */}
      <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="mb-2 text-sm text-neutral-300">
           <b>{user.username}</b>
        </div>

        <EmojiRating value={rating} onChange={setRating} />

        <textarea
          className="mt-3 w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          rows={3}
          placeholder="Write a short review..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Saving"}
          </button>
          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </div>

      {/* lista */}
      {loading ? (
        <div className="text-neutral-400">Betöltés…</div>
      ) : !list.length ? (
        <div className="text-neutral-400">There are no reviews.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-1 text-sm text-neutral-400">
                {r.user_username || r.user?.username || `Felhasználó #${r.user_id}`}
                {" • "}
                {new Date(r.created_at).toLocaleString()}
              </div>

              <div className="mb-1 text-lg">
                {["😡","🙁","😐","🙂","🤩"][Math.max(0, Math.min(4, Math.round(r.rating) - 1))]}
                <span className="ml-2 align-middle text-sm text-neutral-300">
                  {Number(r.rating).toFixed(1)} / 5
                </span>
              </div>
              {r.text && <div className="whitespace-pre-wrap text-neutral-200">{r.text}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReviewsBox({ movieId, onRequireLogin, ...props }) {
  const auth = useAuthOptional(); // lehet null
  const user = auth?.user || null;
  const access = auth?.access || "";

  if (!user) {
    return (
      <div className="rounded-lg border border-white/10 p-4">
        <p className="text-sm text-neutral-300">Írj értékelést a bejelentkezés után.</p>
        <button
          className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-sm"
          onClick={onRequireLogin}
        >
          Belépés / Regisztráció
        </button>
      </div>
    );
  }

  return (
    <ReviewsBoxAuthed
      movieId={movieId}
      user={user}
      access={access}
      onRequireLogin={onRequireLogin}
      {...props}
    />
  );
}
