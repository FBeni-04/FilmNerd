// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import {afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import AddToListModel from '../AddToListModel';
import * as AuthContext from '../AuthContext';


// Mock AuthContext
vi.mock('../AuthContext', async () => {
  const actual = await vi.importActual('../AuthContext');
  return {
    ...actual,
    useAuthOptional: vi.fn(),
  };
});

// Mock fetch
globalThis.fetch = vi.fn();

describe('AddToListModel Component', () => {
afterEach(() => {
    cleanup();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
    });
  });

  it('does not render when show is false', () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({ user: { id: 1 } });
    render(<AddToListModel show={false} onClose={vi.fn()} movieId={123} />);
    expect(screen.queryByText('Add to a List')).not.toBeInTheDocument();
  });

  it('calls onRequireLogin when user is not logged in', () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({ user: null });
    const onRequireLogin = vi.fn();
    const onClose = vi.fn();

    render(
      <AddToListModel 
        show={true} 
        onClose={onClose} 
        movieId={123} 
        onRequireLogin={onRequireLogin} 
      />
    );

    expect(onRequireLogin).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders lists when logged in', async () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({ 
      user: { id: 1 }, 
      access: 'token' 
    });

    const mockLists = {
      results: [
        { id: 1, name: 'My List 1', items: [] },
        { id: 2, name: 'My List 2', items: [1, 2] }
      ]
    };

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLists),
    });

    render(
      <AddToListModel 
        show={true} 
        onClose={vi.fn()} 
        movieId={123} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My List 1')).toBeInTheDocument();
      expect(screen.getByText('My List 2')).toBeInTheDocument();
    });
  });

  it('filters lists based on search term', async () => {
    vi.spyOn(AuthContext, 'useAuthOptional').mockReturnValue({ 
      user: { id: 1 }, 
      access: 'token' 
    });

    const mockLists = {
      results: [
        { id: 1, name: 'Sci-Fi', items: [] },
        { id: 2, name: 'Comedy', items: [] }
      ]
    };

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLists),
    });

    render(
      <AddToListModel 
        show={true} 
        onClose={vi.fn()} 
        movieId={123} 
      />
    );

    await waitFor(() => screen.getByText('Sci-Fi'));

    const searchInput = screen.getByPlaceholderText(/Filter your lists/i);
    fireEvent.change(searchInput, { target: { value: 'Sci' } });

    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.queryByText('Comedy')).not.toBeInTheDocument();
  });
});