import { useMemo, useState } from 'react';
import { BarChart3, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { defaultFilters, useKanjiSearchQuery } from '../hooks/useKanjiQueries';
import type { GlobalFilters } from '../types/kanji';
import LoadingState from './LoadingState';

interface FilterDrawerProps {
  open: boolean;
  filters: GlobalFilters;
  onApply: (filters: GlobalFilters) => void;
  onClose: () => void;
}

type ChartAxis = 'stroke_count' | 'jlpt';

const jlptOptions = [
  { value: '5', label: 'N5' },
  { value: '4', label: 'N4' },
  { value: '3', label: 'N3' },
  { value: '2', label: 'N2' },
  { value: '1', label: 'N1' },
  { value: 'none', label: 'No JLPT' },
];

const ChartDialog = ({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: GlobalFilters;
}) => {
  const [axis, setAxis] = useState<ChartAxis>('stroke_count');
  const query = useKanjiSearchQuery({ filters });

  const bars = useMemo(() => {
    const groups = new Map<string, number>();

    query.data?.forEach((kanji) => {
      const key =
        axis === 'stroke_count'
          ? `${kanji.stroke_count ?? '—'}`
          : kanji.jlpt === null
            ? 'No JLPT'
            : `N${kanji.jlpt}`;

      groups.set(key, (groups.get(key) ?? 0) + 1);
    });

    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, 'ru', { numeric: true }));
  }, [axis, query.data]);

  const max = Math.max(1, ...bars.map(([, count]) => count));

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Статистика">
      <div className="modal-sheet wide">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Analysis</p>
            <h2>Распределение кандзи</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть диаграмму">
            <X size={20} />
          </button>
        </div>

        <div className="segmented-control">
          <button className={axis === 'stroke_count' ? 'active' : ''} type="button" onClick={() => setAxis('stroke_count')}>
            Число черт
          </button>
          <button className={axis === 'jlpt' ? 'active' : ''} type="button" onClick={() => setAxis('jlpt')}>
            JLPT
          </button>
        </div>

        {query.isLoading ? <LoadingState label="Строим диаграмму" /> : null}

        {!query.isLoading && bars.length === 0 ? (
          <div className="empty-state">Недостаточно данных для построения диаграммы.</div>
        ) : null}

        {!query.isLoading && bars.length > 0 ? (
          <div className="bar-chart">
            {bars.map(([label, count]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FilterDrawer = ({ open, filters, onApply, onClose }: FilterDrawerProps) => {
  const [draft, setDraft] = useState(filters);
  const [chartOpen, setChartOpen] = useState(false);

  const toggleJlpt = (value: string) => {
    setDraft((current) => ({
      ...current,
      jlptLevels: current.jlptLevels.includes(value)
        ? current.jlptLevels.filter((item) => item !== value)
        : [...current.jlptLevels, value],
    }));
  };

  if (!open) {
    return (
      <ChartDialog open={chartOpen} onClose={() => setChartOpen(false)} filters={filters} />
    );
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="filter-drawer" aria-label="Глобальные фильтры">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Global filter</p>
            <h2>Фильтры</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть фильтры">
            <X size={20} />
          </button>
        </div>

        <div className="form-grid">
          <div className="field-row">
            <label>
              Черт от
              <input
                inputMode="numeric"
                value={draft.strokeFrom}
                onChange={(event) => setDraft({ ...draft, strokeFrom: event.target.value })}
                placeholder="3"
              />
            </label>
            <label>
              До
              <input
                inputMode="numeric"
                value={draft.strokeTo}
                onChange={(event) => setDraft({ ...draft, strokeTo: event.target.value })}
                placeholder="14"
              />
            </label>
          </div>

          <div>
            <span className="field-label">JLPT</span>
            <div className="chip-grid">
              {jlptOptions.map((option) => (
                <button
                  className={draft.jlptLevels.includes(option.value) ? 'filter-chip selected' : 'filter-chip'}
                  key={option.value}
                  type="button"
                  onClick={() => toggleJlpt(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="switch-row">
            <span>
              <strong>Есть анимация написания</strong>
              <small>Показывать только записи с KanjiVG-данными</small>
            </span>
            <input
              checked={draft.hasAnimation}
              type="checkbox"
              onChange={(event) => setDraft({ ...draft, hasAnimation: event.target.checked })}
            />
          </label>
        </div>

        <div className="drawer-actions">
          <button className="text-button" type="button" onClick={() => onApply(defaultFilters)}>
            <RotateCcw size={18} />
            Сбросить
          </button>
          <button className="text-button" type="button" onClick={() => setChartOpen(true)}>
            <BarChart3 size={18} />
            Диаграмма
          </button>
          <button className="filled-button" type="button" onClick={() => onApply(draft)}>
            <SlidersHorizontal size={18} />
            Применить
          </button>
        </div>
      </aside>

      <ChartDialog open={chartOpen} onClose={() => setChartOpen(false)} filters={filters} />
    </>
  );
};

export default FilterDrawer;
