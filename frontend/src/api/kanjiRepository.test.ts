import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';

type ApiMock = Pick<AxiosInstance, 'get' | 'post' | 'put'>;

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('axios', () => {
  return {
    default: {
      create: () => mockApi as ApiMock,
      isAxiosError: (error: unknown) => error !== null && typeof error === 'object' && 'isAxiosError' in error && Boolean((error as { isAxiosError?: unknown }).isAxiosError),
    },
  };
});

import * as repo from './kanjiRepository';

const setApiMock = (mockApi: ApiMock) => {
  repo.__setApiForTest(mockApi as Parameters<typeof repo.__setApiForTest>[0]);
};

describe('kanjiRepository API layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes search params as expected', async () => {
    // replace the created instance used by module
    // instead of spying, directly mock api.get via module import
    const mockGet = vi.fn().mockResolvedValue({ data: [] });
    setApiMock({ get: mockGet, post: vi.fn(), put: vi.fn() });

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
    setApiMock({ get: mockGet, post: vi.fn(), put: vi.fn() });

    await expect(repo.searchKanji({ text: 'x' })).rejects.toThrow('bad');
  });

  it('loginAdmin sends correct payload', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: { username: 'a', access_token: 't', token_type: 'bearer' } });
    setApiMock({ get: vi.fn(), post: mockPost, put: vi.fn() });

    const res = await repo.loginAdmin('u', 'p');
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' });
    expect(res).toHaveProperty('access_token');
  });

  it('importDatabaseFromFile sends FormData and Authorization header', async () => {
    const mockPost = vi.fn().mockResolvedValue({ data: {} });
    setApiMock({ get: vi.fn(), post: mockPost, put: vi.fn() });

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
