// src/components/__tests__/MovieLists.test.jsx
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1) AuthContext mock – factory-n belül jönnek a vi.fn()-ek
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

// 2) Navbar mock
vi.mock("../Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="navbar" />,
}));

// 3) AuthModal mock
vi.mock("../AuthModal", () => ({
  __esModule: true,
  default: ({ show }) =>
    show ? <div data-testid="auth-modal">AuthModal</div> : null,
}));

// 4) A komponens-import már a mockok után jön
import MovieLists from "../../MovieLists";
import * as AuthContext from "../AuthContext";

// hook referenciák
const useAuthMock = AuthContext.useAuth;
const useAuthOptionalMock = AuthContext.useAuthOptional;

// fetch mock
global.fetch = vi.fn();

describe("MovieLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("login nélkül login felszólítást mutat", () => {
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

    // cím
    expect(screen.getByText("My Lists")).toBeInTheDocument();
    // login szöveg + gomb
    expect(
      screen.getByText(/Please\s+Login\s+to create and view your movie lists\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  it("belépett usernél üres listáknál az üres állapotot mutatja", async () => {
    useAuthMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token-123",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token-123",
      showLogin: vi.fn(),
    });

    // első (és egyetlen) fetch: GET /lists/ → üres tömb
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    // "Loading your lists..." → majd az üres állapot szöveg
    expect(
      await screen.findByText("You haven't created any lists yet.")
    ).toBeInTheDocument();
  });

  it("belépett usernél listákat jelenít meg, ha vannak", async () => {
    useAuthMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token-123",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: { id: 1, username: "testuser" },
      access: "token-123",
      showLogin: vi.fn(),
    });

    const mockLists = [
      {
        id: 1,
        name: "My First List",
        items: [{ movie_id: 101 }, { movie_id: 102 }],
      },
      {
        id: 2,
        name: "Watch Later",
        items: [{ movie_id: 201 }],
      },
    ];

    // GET /lists/ → két lista
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: mockLists }),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    // listanevek
    expect(await screen.findByText("My First List")).toBeInTheDocument();
    expect(await screen.findByText("Watch Later")).toBeInTheDocument();

    // darabszám szövegek (2 Films, 1 Film)
    expect(screen.getByText("2 Films")).toBeInTheDocument();
    expect(screen.getByText("1 Film")).toBeInTheDocument();
  });
});