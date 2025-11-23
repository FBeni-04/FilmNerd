import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1) AuthContext mock – a factory-n belül hozzuk létre a vi.fn()-eket
vi.mock("../AuthContext", () => {
  const useAuth = vi.fn();
  const useAuthOptional = vi.fn();
  const AuthProvider = ({ children }) => <>{children}</>;

  return {
    __esModule: true,
    default: AuthProvider,
    useAuth,
    useAuthOptional,
  };
});

// 2) Navbar mock – ne húzza be a valódi useAuth-ot
vi.mock("../Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="navbar" />,
}));

// 3) A komponens ezután jön, így már a MOCKOLT modulokat fogja használni
import MovieLists from "../../MovieLists";
import * as AuthContext from "../AuthContext";

// a mockolt hookok referenciái
const useAuthMock = AuthContext.useAuth;
const useAuthOptionalMock = AuthContext.useAuthOptional;

// fetch mock
global.fetch = vi.fn();

describe("MovieLists Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // default: üres lista választ
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it("renders login prompt when not logged in", async () => {
    // Navbar miatt is kell useAuth, a MovieLists-ben pedig useAuthOptional
    useAuthMock.mockReturnValue({
      user: null,
      access: "",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: null,
      access: "",
      showLogin: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it("shows empty state when no lists exist", async () => {
    useAuthMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token",
      showLogin: vi.fn(),
    });

    // üres tömböt ad vissza – nincs lista
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    await waitFor(() => {
      // IDE azt a konkrét szöveget írd, ami az üres állapotodban van
      // ha nem "no lists", akkor módosítsd a regexet
      expect(screen.getByText(/no lists/i)).toBeInTheDocument();
    });
  });

  it("renders lists when logged in", async () => {
    useAuthMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token",
      showLogin: vi.fn(),
    });

    const mockLists = [
      { id: 1, name: "My First List" },
      { id: 2, name: "Watch Later" },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLists),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My First List")).toBeInTheDocument();
      expect(screen.getByText("Watch Later")).toBeInTheDocument();
    });
  });
});
