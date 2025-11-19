// frontend/src/AuthContext.jsx
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

// PROD-ban: VITE_API_BASE = "https://filmnerd.onrender.com/api"
// DEV-ben: fallback "/api" → Vite proxy kezeli
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(localStorage.getItem("access") || "");

  async function fetchMe(token = access) {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // token lejárt / érvénytelen
        localStorage.removeItem("access");
        setAccess("");
        setUser(null);
      }
    } catch (err) {
      console.error("fetchMe error:", err);
      setUser(null);
    }
  }

  async function login(payload) {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = "Wrong username or password";
      try {
        const data = await res.json();
        if (data.detail) msg = data.detail;
      } catch (_) {}
      throw new Error(msg);
    }

    const data = await res.json();
    localStorage.setItem("access", data.access);
    setAccess(data.access);
    setUser(data.user);
  }

  async function register(payload) {
    const res = await fetch(`${API_BASE}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = "Registration failed";
      try {
        const data = await res.json();
        if (data.detail) msg = data.detail;
      } catch (_) {}
      throw new Error(msg);
    }

    const data = await res.json();
    localStorage.setItem("access", data.access);
    setAccess(data.access);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("access");
    setAccess("");
    setUser(null);
  }

  // első betöltéskor, illetve ha access változik, próbáljuk lekérni a usert
  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  return (
    <AuthCtx.Provider value={{ user, access, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
