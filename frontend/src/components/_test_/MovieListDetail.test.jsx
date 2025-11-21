// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import {afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import MovieListDetail from '../../MovieListDetail';
import * as AuthContext from '../AuthContext';

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
  default: ({ children }) => <div>{children}</div>,
}));

// Mock AuthModal
vi.mock('../AuthModal', () => ({
  default: () => <div>Auth Modal</div>
}));

// Mock useParams
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
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null });
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
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      user: { id: 1 }, 
      access: 'token' 
    });
    vi.mocked(useParams).mockReturnValue({ listId: '1' });

    const mockList = {
      id: 1,
      name: 'My Awesome List',
      items: [{ movie_id: '123' }]
    };

    const mockMovie = {
      id: 123,
      title: 'The Matrix',
      poster_path: '/poster.jpg'
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