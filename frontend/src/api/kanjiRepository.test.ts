import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('axios', () => {
  return {
    default: {
      create: () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }),
    },
    isAxiosError: (e: any) => !!e && !!e.isAxiosError,
  };
});

import axios from 'axios';
import * as repo from './kanjiRepository';

describe('kanjiRepository API layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes search params as expected', async () => {
    // replace the created instance used by module
    // instead of spying, directly mock api.get via module import
    const mockGet = vi.fn().mockResolvedValue({ data: [] });
    // monkeypatch the module's internal api instance
    (repo as any).__setApiForTest?.({ get: mockGet, post: vi.fn() });

    await repo.searchKanji({ text: ' 本 ', radicals: ['木'], strokeCount: 5 });

    expect(mockGet).toHaveBeenCalled();
    const [url, opts] = mockGet.mock.calls[0];
    expect(url).toBe('/search');
    expect(opts).toHaveProperty('params');
    expect(opts.params.text).toBe('本');
    expect(opts.params.radicals).toBe('木');
    expect(opts.params.stroke_count).toBe(5);
  });

  it('extracts api error message from axios error with detail string', async () => {
    const mockGet = vi.fn().mockRejectedValue({ isAxiosError: true, response: { data: { detail: 'bad' } } });
    (repo as any).__setApiForTest?.({ get: mockGet, post: vi.fn() });

    await expect(repo.searchKanji({ text: 'x' })).rejects.toThrow('bad');
  });

  it('loginAdmin sends correct payload', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: { username: 'a', access_token: 't', token_type: 'bearer' } });
    (repo as any).__setApiForTest?.({ get: vi.fn(), post: mockPost });

    const res = await repo.loginAdmin('u', 'p');
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' });
    expect(res).toHaveProperty('access_token');
  });

  it('importDatabaseFromFile sends FormData and Authorization header', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: {} });
    (repo as any).__setApiForTest?.({ get: vi.fn(), post: mockPost });

    const file = new File(['{}'], 'db.json', { type: 'application/json' });
    await repo.importDatabaseFromFile(file, 'token123');

    expect(mockPost).toHaveBeenCalled();
    const [url, form, opts] = mockPost.mock.calls[0];
    expect(url).toBe('/import');
    // form should be FormData
    expect(form instanceof FormData).toBe(true);
    expect(opts.headers.Authorization).toBe('Bearer token123');
  });
});
