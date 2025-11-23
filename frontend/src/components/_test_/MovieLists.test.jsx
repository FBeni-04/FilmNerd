// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup} from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
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
  default: () => <div data-testid="auth-modal">Auth Modal</div>
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
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      user: null, 
      access: null, 
      showLogin: vi.fn() 
    });

    render(
      <BrowserRouter>
        <MovieLists />
      </BrowserRouter>
    );

    expect(screen.getByText(/Please/i)).toBeInTheDocument();
    const loginButtons = screen.getAllByText(/Login/i);
    expect(loginButtons.length).toBeGreaterThan(0);
  });

  it('renders lists when logged in', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      user: { id: 1 }, 
      access: 'token',
      showLogin: vi.fn() 
    });

    const mockLists = {
      results: [
        { id: 1, name: 'Favorites', items: [] },
        { id: 2, name: 'Watch Later', items: [1] }
      ]
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
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Watch Later')).toBeInTheDocument();
    });
  });

  it('shows empty state when no lists exist', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      user: { id: 1 }, 
      access: 'token' 
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
      expect(screen.getByText(/You haven't created any lists yet/i)).toBeInTheDocument();
    });
  });
});