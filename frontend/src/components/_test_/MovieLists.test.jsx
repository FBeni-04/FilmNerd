import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import MovieLists from '../../MovieLists';
import * as AuthContext from '../AuthContext';

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
  useAuthOptional: vi.fn(),
  // Mock AuthProvider default export
  default: ({ children }) => <div>{children}</div>,
}));

// Mock AuthModal component to avoid its internal logic running
vi.mock('../AuthModal', () => ({
  default: () => <div data-testid="auth-modal">Auth Modal</div>,
}));

// Mock fetch
global.fetch = vi.fn();

describe('MovieLists Component', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
  });

  it('renders login prompt when not logged in', () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({
      user: null,
      access: null,
      showLogin: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    // elég rugalmasan csak a "Please" kezdetet ellenőrizzük
    expect(screen.getByText(/Please/i)).toBeInTheDocument();
    const loginButtons = screen.getAllByText(/Login/i);
    expect(loginButtons.length).toBeGreaterThan(0);
  });

  it('renders lists when logged in', async () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({
      user: { id: 1 },
      access: 'token',
      showLogin: vi.fn(),
    });

    const mockLists = {
      results: [
        { id: 1, name: 'Favorites', items: [] },
        { id: 2, name: 'Watch Later', items: [1] },
      ],
    };

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
      // regex, hogy akkor is jó legyen, ha utána extra szöveg van
      expect(screen.getByText(/Favorites/i)).toBeInTheDocument();
      expect(screen.getByText(/Watch Later/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no lists exist', async () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({
      user: { id: 1 },
      access: 'token',
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    await waitFor(() => {
      // rugalmas matcher: whitespace-ek összefésülése + substring keresés
      const emptyState = screen.getByText((content) =>
        content
          .replace(/\s+/g, ' ')
          .toLowerCase()
          .includes("you haven't created any lists yet")
      );
      expect(emptyState).toBeInTheDocument();
    });
  });
});
