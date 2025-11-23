import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import MovieListDetail from '../../MovieListDetail';
import * as AuthContext from '../AuthContext';

// --- Mock AuthContext: useAuthOptional-t fogunk használni ---
vi.mock('../AuthContext', () => ({
  useAuthOptional: vi.fn(),
  default: ({ children }) => <div>{children}</div>,
}));

// Mock AuthModal
vi.mock('../AuthModal', () => ({
  default: () => <div>Auth Modal</div>,
}));

// Mock useParams (megtartjuk az eredeti BrowserRouter-t, csak useParams-t írjuk felül)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('MovieListDetail Component', () => {
  const useAuthOptionalMock = AuthContext
    .useAuthOptional;

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

  it('renders login prompt when not logged in', () => {
    useAuthOptionalMock.mockReturnValue({
      user: null,
      access: null,
      showLogin: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ listId: '1' });

    render(
      <BrowserRouter>
        <MovieListDetail />
      </BrowserRouter>
    );

    expect(screen.getByText(/Please/i)).toBeInTheDocument();
    const loginButtons = screen.getAllByText(/Login/i);
    expect(loginButtons.length).toBeGreaterThan(0);
  });

  it('renders list details when logged in', async () => {
    useAuthOptionalMock.mockReturnValue({
      user: { id: 1 },
      access: 'token',
      showLogin: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ listId: '1' });

    const mockList = {
      id: 1,
      name: 'My Awesome List',
      items: [{ movie_id: '123' }],
    };

    const mockMovie = {
      id: 123,
      title: 'The Matrix',
      poster_path: '/poster.jpg',
    };

    // Mock fetch calls: first for list, then for movie
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
      expect(screen.getByText('My Awesome List')).toBeInTheDocument();
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
    });
  });
});
