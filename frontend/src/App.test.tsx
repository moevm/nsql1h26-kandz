import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import App from './App';

vi.mock('./components/AppShell', () => ({
  default: () => (
    <div data-testid="app-shell">
      <Outlet />
    </div>
  ),
}));

vi.mock('./components/LoadingState', () => ({
  default: ({ label }: { label: string }) => <div role="status">{label}</div>,
}));

vi.mock('./pages/SearchPage', () => ({
  default: () => <div data-testid="search-page" />,
}));

vi.mock('./pages/DataPage', () => ({
  default: () => <div data-testid="data-page" />,
}));

vi.mock('./pages/KanjiDetailPage', () => ({
  default: () => <div data-testid="kanji-detail-page" />,
}));

vi.mock('./pages/ChartsPage', () => ({
  default: () => <div data-testid="charts-page" />,
}));

describe('App routing', () => {
  it('redirects root to canvas search', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByTestId('search-page')).toBeInTheDocument();
  });

  it('redirects unknown routes to canvas search', async () => {
    window.history.pushState({}, '', '/unknown');
    render(<App />);

    expect(await screen.findByTestId('search-page')).toBeInTheDocument();
  });
});
