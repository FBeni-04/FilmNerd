import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthModal({ show, onClose }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login"); // login | register
  const [form, setForm] = useState({ username: "", email: "", name: "", password: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    // body scroll tiltása, ha nyitva van
    if (show) document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [show]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (tab === "login") {
        await login({ username: form.username, password: form.password });
      } else {
        await register({
          username: form.username,
          email: form.email,
          name: form.name,
          password: form.password,
        });
      }
      onClose?.();
    } catch (ex) {
      setErr(ex.message || "Error occurred");
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4
                min-h-screen"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 shadow-xl">
        {/* Header + tabok */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="inline-flex rounded-xl bg-neutral-800/60 p-1">
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${tab==="login" ? "bg-neutral-700 text-white" : "text-neutral-300 hover:text-white"}`}
              onClick={() => setTab("login")}
            >
              Login
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-lg ${tab==="register" ? "bg-neutral-700 text-white" : "text-neutral-300 hover:text-white"}`}
              onClick={() => setTab("register")}
            >
              Registration
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-sm text-neutral-300 hover:bg-white/10"
            aria-label="Bezárás"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="px-5 py-4">
          {err && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          <label className="mb-1 block text-xs text-neutral-400">Username</label>
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            className="mb-3 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
            required
          />

          {tab === "register" && (
            <>
              <label className="mb-1 block text-xs text-neutral-400">E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                className="mb-3 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
                required
              />

              <label className="mb-1 block text-xs text-neutral-400">Name (optional)</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="mb-3 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </>
          )}

          <label className="mb-1 block text-xs text-neutral-400">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            className="mb-5 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500/40"
            required
          />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-neutral-100 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-600/30"
            >
              {tab === "login" ? "Login" : "Registration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
