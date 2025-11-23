import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter, useParams } from "react-router-dom";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import MovieListDetail from "../../MovieListDetail";

// 1) KÜLÖN mock függvényeket hozunk létre
const useAuthMock = vi.fn();
const useAuthOptionalMock = vi.fn();

vi.mock("../AuthContext", () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
  useAuth: useAuthMock,
  useAuthOptional: useAuthOptionalMock,
}));


// 3) (opcionális) Navbar mock, hogy ne zavarjon
vi.mock("../Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="navbar" />,
}));

// 4) react-router-dom mock: csak useParams-t írjuk felül
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});


const mockedUseParams = useParams; // ez már egy vi.fn lesz a mock miatt

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
    // Itt már simán használhatod:
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
