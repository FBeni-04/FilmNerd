import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

// 1) AuthContext mock – itt HOZZUK LÉTRE a vi.fn()-eket
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

// 3) react-router-dom mock: csak useParams-t írjuk felül
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// 4) MOST jönnek az importok – már a mockolt modulokra mutatnak
import MovieListDetail from "../../MovieListDetail";
import * as AuthContext from "../AuthContext";
import { useParams } from "react-router-dom";

// mockolt hookok, amiket használni fogunk a tesztekben
const useAuthMock = AuthContext.useAuth;
const useAuthOptionalMock = AuthContext.useAuthOptional;
const mockedUseParams = useParams;

// 5) fetch mock
global.fetch = vi.fn();

describe("MovieListDetail Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders login prompt when not logged in", () => {
    // Navbar miatt is kell useAuth, MovieListDetail-nek useAuthOptional
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

    expect(screen.getByText(/Please/i)).toBeInTheDocument();
    const loginButtons = screen.getAllByText(/Login/i);
    expect(loginButtons.length).toBeGreaterThan(0);
  });

  it("renders list details when logged in", async () => {
    useAuthMock.mockReturnValue({
      user: { id: 1 },
      access: "token",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    useAuthOptionalMock.mockReturnValue({
      user: { id: 1 },
      access: "token",
      showLogin: vi.fn(),
    });

    mockedUseParams.mockReturnValue({ listId: "1" });

    const mockList = {
      id: 1,
      name: "My Awesome List",
      items: [{ movie_id: "123" }],
    };

    const mockMovie = {
      id: 123,
      title: "The Matrix",
      poster_path: "/poster.jpg",
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockList),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMovie),
      });

    render(
      <BrowserRouter>
        <MovieListDetail />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My Awesome List")).toBeInTheDocument();
      expect(screen.getByText("The Matrix")).toBeInTheDocument();
    });
  });
});
