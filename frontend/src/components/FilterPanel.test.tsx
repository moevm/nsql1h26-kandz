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

  it('toggles jlpt chip and reset button state', async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <FilterPanel
        collapsed={false}
        filters={emptyFilters}
        onChange={onChange}
        onReset={onReset}
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'N5' }));
    expect(onChange).toHaveBeenCalled();

    const reset = screen.getByRole('button', { name: /сбросить/i });
    expect(reset).toBeDisabled();
  });

  it('updates range filter inputs', async () => {
    const user = userEvent.setup();
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
    fireEvent.change(strokeFrom, { target: { value: '3' } });

    expect(onChange).toHaveBeenCalled();
  });
});
