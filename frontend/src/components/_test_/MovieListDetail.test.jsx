// src/components/__tests__/MovieListDetail.test.jsx
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1) AuthContext mock – itt hozzuk létre a vi.fn()-eket
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

// 4) SearchBox mock
vi.mock("../SearchBox", () => ({
  __esModule: true,
  default: ({ onSelect }) => (
    <div
      data-testid="search-box"
      // ha szeretnéd, tesztben hívható lenne így:
      // onClick={() => onSelect && onSelect(999)}
    >
      SearchBox
    </div>
  ),
}));

// 5) react-router-dom mock: csak useParams-t írjuk felül
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// 6) MOST jönnek az importok – már a mockolt modulokra mutatnak
import MovieListDetail from "../../MovieListDetail";
import * as AuthContext from "../AuthContext";
import { useParams } from "react-router-dom";

// mockolt hookok referenciái
const useAuthMock = AuthContext.useAuth;
const useAuthOptionalMock = AuthContext.useAuthOptional;
const mockedUseParams = useParams;

// fetch mock
global.fetch = vi.fn();

describe("MovieListDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("login nélkül a belépési felszólítást mutatja", () => {
    useAuthMock.mockReturnValue({
      user: null,
      access: "",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: null,
      access: null,
      showLogin: vi.fn(),
    });

    mockedUseParams.mockReturnValue({ listId: "1" });

    render(
      <BrowserRouter>
        <MovieListDetail />
      </BrowserRouter>
    );

    // szöveg: "Please Login to view your movie lists."
    expect(screen.getByText(/Please/i)).toBeInTheDocument();
    expect(screen.getByText(/to view your movie lists/i)).toBeInTheDocument();

    const loginButton = screen.getByText(/Login/i);
    expect(loginButton).toBeInTheDocument();
  });

  it("belépett usernél megjeleníti a lista nevét és a filmeket", async () => {
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

    mockedUseParams.mockReturnValue({ listId: "42" });

    const mockList = {
      id: 42,
      name: "My Sci-Fi List",
      items: [{ movie_id: 101 }],
    };

    // backend + TMDB hívások szétválasztása URL alapján
    global.fetch.mockImplementation((url, options = {}) => {
      const urlStr = String(url);

      // 1) backend: GET /lists/:id/
      if (urlStr.includes("/lists/") && (!options.method || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockList),
        });
      }

      // 2) TMDB hívás
      if (urlStr.includes("api.themoviedb.org")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 101,
              title: "The Matrix",
              poster_path: "/matrix.jpg",
            }),
        });
      }

      // fallback (nem kéne, de legyen)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <BrowserRouter>
        <MovieListDetail />
      </BrowserRouter>
    );

    // lista neve
    expect(await screen.findByText("My Sci-Fi List")).toBeInTheDocument();
    // film címe
    expect(await screen.findByText("The Matrix")).toBeInTheDocument();
  });
});
