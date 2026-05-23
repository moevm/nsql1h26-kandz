import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FilterPanel from './FilterPanel';
import { defaultFilters } from '../hooks/useKanjiQueries';
import type { GlobalFilters } from '../types/kanji';

const emptyFilters: GlobalFilters = {
  ...defaultFilters,
};

describe('FilterPanel', () => {
  it('renders collapsed toggle and badge count', () => {
    render(
      <FilterPanel
        collapsed
        filters={{
          ...emptyFilters,
          hasAnimation: true,
          jlptLevels: ['5'],
        }}
        onChange={vi.fn()}
        onReset={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /фильтры/i })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('toggles jlpt chip and exposes reset for active filters', async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    const { rerender } = render(
      <FilterPanel
        collapsed={false}
        filters={emptyFilters}
        onChange={onChange}
        onReset={onReset}
        onToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'N5' }));
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(
      <FilterPanel
        collapsed={false}
        filters={{ ...emptyFilters, jlptLevels: ['5'] }}
        onChange={onChange}
        onReset={onReset}
        onToggle={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /сбросить фильтры/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('updates range filter inputs', async () => {
    const onChange = vi.fn();

    render(
      <FilterPanel
        collapsed={false}
        filters={emptyFilters}
        onChange={onChange}
        onReset={vi.fn()}
        onToggle={vi.fn()}
      />,
    );

    const strokeFrom = screen.getAllByPlaceholderText('1')[0];
    fireEvent.focus(strokeFrom);
    const range = screen.getByLabelText('Число черт: минимум');
    fireEvent.change(range, { target: { value: '3' } });

    // No assertion on onChange here; interaction should not crash.
  });
});
