import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import AppShell from './AppShell';

vi.mock('./FilterPanel', () => ({
  default: () => <div data-testid="filter-panel" />,
}));

vi.mock('../hooks/useKanjiQueries', () => ({
  defaultFilters: {
    text: '',
    radicals: [],
    strokeCount: '',
    grade: '',
    jlpt: '',
    filters: {
      strokeFrom: '',
      strokeTo: '',
      jlptLevels: [],
      gradeLevels: [],
      freqFrom: '',
      freqTo: '',
      wordsFrom: '',
      wordsTo: '',
      examplesFrom: '',
      examplesTo: '',
      radicalsFrom: '',
      radicalsTo: '',
      readingsFrom: '',
      readingsTo: '',
      hasAnimation: false,
    },
  },
}));

describe('AppShell', () => {
  it('renders the navigation and filter shell', () => {
    render(
      <MemoryRouter initialEntries={['/search/canvas']}>
        <Routes>
          <Route element={<AppShell />} path="/">
            <Route element={<div data-testid="shell-page" />} path="search/:mode" />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('navigation').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('KanjiLookup')).toBeInTheDocument();
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
  });
});
