import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchPage from './SearchPage';

const mockState = {
  search: {
    data: undefined,
    isLoading: true,
    isError: false,
    isFetching: false,
    error: undefined as Error | undefined,
  },
  groups: {
    data: undefined,
    isLoading: true,
    isError: false,
    isFetching: false,
    error: undefined as Error | undefined,
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ mode: 'radicals' }),
    useOutletContext: () => ({
      filters: { strokeFrom: '', strokeTo: '', jlptLevels: [], gradeLevels: [], freqFrom: '', freqTo: '', wordsFrom: '', wordsTo: '', examplesFrom: '', examplesTo: '', radicalsFrom: '', radicalsTo: '', readingsFrom: '', readingsTo: '', hasAnimation: false },
      draftRadicals: [],
      setDraftRadicals: vi.fn(),
      appliedRadicals: [],
      setAppliedRadicals: vi.fn(),
    }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../components/CanvasSearch', () => ({ default: () => <div data-testid="canvas-search" /> }));
vi.mock('../components/KanjiList', () => ({ default: () => <div data-testid="kanji-list" /> }));
vi.mock('../components/LoadingState', () => ({ default: ({ label }: { label: string }) => <div role="status">{label}</div> }));

vi.mock('../hooks/useKanjiQueries', () => ({
  useKanjiSearchPageQuery: () => mockState.search,
  useRadicalGroupsQuery: () => mockState.groups,
}));

describe('SearchPage loading and error states', () => {
  beforeEach(() => {
    mockState.search = {
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
      error: undefined,
    };
    mockState.groups = {
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
      error: undefined,
    };
  });

  it('shows loading state while data is loading', () => {
    render(<SearchPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем каталог');
  });

  it('shows error state when queries fail', () => {
    mockState.search = {
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      error: new Error('search failed'),
    };
    mockState.groups = {
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      error: new Error('groups failed'),
    };

    render(<SearchPage />);

    expect(screen.getByText('search failed')).toBeInTheDocument();
  });
});
