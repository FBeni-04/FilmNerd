import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (ctx === null) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(localStorage.getItem("access") || "");

  async function fetchMe(token = access) {
    if (!token) { setUser(null); return; }
    const res = await fetch("/api/auth/me/", { headers: { Authorization: `Bearer ${token}` }});
    setUser(res.ok ? await res.json() : null);
  }

  async function login(payload) {
    const r = await fetch("/api/auth/login/", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("Wrong username or password");
    const data = await r.json();
    localStorage.setItem("access", data.access);
    setAccess(data.access);
    setUser(data.user);
  }

  async function register(payload) {
    const r = await fetch("/api/auth/register/", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("Registration failed");
    const data = await r.json();
    localStorage.setItem("access", data.access);
    setAccess(data.access);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("access");
    setAccess("");
    setUser(null);
  }

  useEffect(() => { fetchMe(); }, []); // első betöltéskor

  return (
    <AuthCtx.Provider value={{ user, access, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
