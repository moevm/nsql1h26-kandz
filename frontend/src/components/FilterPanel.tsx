import { useRef, useState } from 'react';
import type { CSSProperties, Dispatch, FocusEvent, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { GlobalFilters } from '../types/kanji';

interface FilterPanelProps {
  collapsed: boolean;
  filters: GlobalFilters;
  onChange: Dispatch<SetStateAction<GlobalFilters>>;
  onReset: () => void;
  onToggle: () => void;
}

interface RangeFilterConfig {
  title: string;
  fromKey: keyof Pick<GlobalFilters, 'strokeFrom' | 'freqFrom' | 'wordsFrom' | 'examplesFrom' | 'radicalsFrom' | 'readingsFrom'>;
  toKey: keyof Pick<GlobalFilters, 'strokeTo' | 'freqTo' | 'wordsTo' | 'examplesTo' | 'radicalsTo' | 'readingsTo'>;
  min: number;
  max: number;
  fromPlaceholder: string;
  toPlaceholder: string;
  chipLabel: string;
}

const jlptOptions = ['5', '4', '3', '2', '1', 'none'];
const gradeOptions = ['1', '2', '3', '4', '5', '6', '8', 'none'];

const rangeFilters: RangeFilterConfig[] = [
  { title: 'Число черт', fromKey: 'strokeFrom', toKey: 'strokeTo', min: 1, max: 64, fromPlaceholder: '1', toPlaceholder: '64', chipLabel: 'черт' },
  { title: 'Частотность', fromKey: 'freqFrom', toKey: 'freqTo', min: 1, max: 3000, fromPlaceholder: '1', toPlaceholder: '2500', chipLabel: 'freq' },
  { title: 'Слова', fromKey: 'wordsFrom', toKey: 'wordsTo', min: 0, max: 40, fromPlaceholder: '2', toPlaceholder: '30', chipLabel: 'слов' },
  { title: 'Примеры', fromKey: 'examplesFrom', toKey: 'examplesTo', min: 0, max: 12, fromPlaceholder: '1', toPlaceholder: '8', chipLabel: 'примеров' },
  { title: 'Радикалы в записи', fromKey: 'radicalsFrom', toKey: 'radicalsTo', min: 1, max: 8, fromPlaceholder: '1', toPlaceholder: '5', chipLabel: 'радикалов' },
  { title: 'Чтения', fromKey: 'readingsFrom', toKey: 'readingsTo', min: 0, max: 12, fromPlaceholder: '1', toPlaceholder: '8', chipLabel: 'чтений' },
];

const chipLabel = (value: string, prefix: string) => (value === 'none' ? 'без' : `${prefix}${value}`);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

const rangeSummary = (filters: GlobalFilters, config: RangeFilterConfig) => {
  const from = filters[config.fromKey];
  const to = filters[config.toKey];

  if (!from && !to) {
    return null;
  }

  if (from && to) {
    return `${config.chipLabel}: ${from}-${to}`;
  }

  return from ? `${config.chipLabel}: от ${from}` : `${config.chipLabel}: до ${to}`;
};

const activeFilters = (filters: GlobalFilters) => [
  ...rangeFilters.map((config) => rangeSummary(filters, config)).filter(Boolean),
  filters.jlptLevels.length ? `JLPT: ${filters.jlptLevels.map((level) => chipLabel(level, 'N')).join(', ')}` : null,
  filters.gradeLevels.length ? `Класс: ${filters.gradeLevels.map((level) => chipLabel(level, '')).join(', ')}` : null,
  filters.hasAnimation ? 'есть порядок черт' : null,
].filter(Boolean) as string[];

const RangeFilter = ({
  config,
  filters,
  update,
}: {
  config: RangeFilterConfig;
  filters: GlobalFilters;
  update: <Key extends keyof GlobalFilters>(key: Key, value: GlobalFilters[Key]) => void;
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeBound, setActiveBound] = useState<'from' | 'to' | null>(null);
  const rawFrom = filters[config.fromKey];
  const rawTo = filters[config.toKey];
  const fromValue = rawFrom ? clamp(Number(rawFrom), config.min, config.max) : config.min;
  const toValue = rawTo ? clamp(Number(rawTo), config.min, config.max) : config.max;
  const safeFrom = Math.min(fromValue, toValue);
  const safeTo = Math.max(fromValue, toValue);
  const activeValue = activeBound === 'from' ? safeFrom : safeTo;
  const range = Math.max(1, config.max - config.min);
  const fromPosition = ((safeFrom - config.min) / range) * 100;
  const toPosition = ((safeTo - config.min) / range) * 100;

  const updateBound = (bound: 'from' | 'to', rawValue: string) => {
    if (!rawValue) {
      update(bound === 'from' ? config.fromKey : config.toKey, '' as never);
      return;
    }

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const value = clamp(parsed, config.min, config.max);
    const nextValue = bound === 'from' ? Math.min(value, safeTo) : Math.max(value, safeFrom);
    update(bound === 'from' ? config.fromKey : config.toKey, String(nextValue) as never);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!sectionRef.current?.contains(event.relatedTarget as Node | null)) {
      setActiveBound(null);
    }
  };

  return (
    <section className="filter-section range-filter-section" ref={sectionRef} onBlurCapture={handleBlur}>
      <h3>{config.title}</h3>
      <div className="filter-field-row">
        <label>
          <span>От</span>
          <input
            inputMode="numeric"
            value={rawFrom}
            onChange={(event) => updateBound('from', event.target.value)}
            onFocus={() => setActiveBound('from')}
            placeholder={config.fromPlaceholder}
          />
        </label>
        <label>
          <span>До</span>
          <input
            inputMode="numeric"
            value={rawTo}
            onChange={(event) => updateBound('to', event.target.value)}
            onFocus={() => setActiveBound('to')}
            placeholder={config.toPlaceholder}
          />
        </label>
      </div>

      {activeBound ? (
        <div className="range-popover">
          <div className="dual-range-shell" style={{ '--from': `${fromPosition}%`, '--to': `${toPosition}%` } as CSSProperties}>
            <div className="dual-range-track" />
            <div className="dual-range-band" />
            <span className={activeBound === 'from' ? 'range-marker active from' : 'range-marker from'} />
            <span className={activeBound === 'to' ? 'range-marker active to' : 'range-marker to'} />
            <input
              aria-label={activeBound === 'from' ? `${config.title}: минимум` : `${config.title}: максимум`}
              className="range-input"
              type="range"
              min={config.min}
              max={config.max}
              value={activeValue}
              onChange={(event) => updateBound(activeBound, event.target.value)}
            />
          </div>
          <div className="range-scale">
            <span>{config.min}</span>
            <span>{config.max}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const FilterPanel = ({ collapsed, filters, onChange, onReset, onToggle }: FilterPanelProps) => {
  const selectedFilters = activeFilters(filters);
  const count = selectedFilters.length;

  const update = <Key extends keyof GlobalFilters>(key: Key, value: GlobalFilters[Key]) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  const toggleListValue = (key: 'jlptLevels' | 'gradeLevels', value: string) => {
    onChange((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  return (
    <aside className={collapsed ? 'filter-panel collapsed' : 'filter-panel'} aria-label="Фильтры базы">
      <button className="filter-panel-toggle" type="button" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        <span>Фильтры</span>
        {count > 0 ? <span className="badge">{count}</span> : null}
      </button>

      {collapsed ? null : (
        <div className="filter-panel-body">
          <div className="filter-summary">
            <h2>Ограничения поиска</h2>
            <span>{count > 0 ? `${count} активно` : 'без ограничений'}</span>
          </div>

          {selectedFilters.length > 0 ? (
            <div className="active-filter-row">
              <div className="active-filter-list" aria-label="Выбранные фильтры">
                {selectedFilters.map((filter) => (
                  <span key={filter}>{filter}</span>
                ))}
              </div>
              <button className="icon-button compact-icon" type="button" onClick={onReset} aria-label="Сбросить фильтры" title="Сбросить фильтры">
                <RotateCcw size={16} />
              </button>
            </div>
          ) : null}

          {rangeFilters.map((config) => (
            <RangeFilter
              activeBound={activeRange?.key === config.fromKey ? activeRange.bound : null}
              config={config}
              filters={filters}
              key={config.fromKey}
              onActivate={(bound) => activateRange(config.fromKey, bound)}
              onDeactivate={() => deactivateRange(config.fromKey)}
              update={update}
            />
          ))}

          <section className="filter-section">
            <h3>JLPT</h3>
            <div className="chip-grid compact-chips">
              {jlptOptions.map((level) => (
                <button
                  className={filters.jlptLevels.includes(level) ? 'filter-chip selected' : 'filter-chip'}
                  key={level}
                  type="button"
                  onClick={() => toggleListValue('jlptLevels', level)}
                >
                  {chipLabel(level, 'N')}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <h3>Класс</h3>
            <div className="chip-grid compact-chips">
              {gradeOptions.map((level) => (
                <button
                  className={filters.gradeLevels.includes(level) ? 'filter-chip selected' : 'filter-chip'}
                  key={level}
                  type="button"
                  onClick={() => toggleListValue('gradeLevels', level)}
                >
                  {chipLabel(level, '')}
                </button>
              ))}
            </div>
          </section>

          <label className="switch-row">
            <span>
              <strong>Есть порядок черт</strong>
              <small>Только записи с SVG-анимацией.</small>
            </span>
            <input checked={filters.hasAnimation} type="checkbox" onChange={(event) => update('hasAnimation', event.target.checked)} />
          </label>

        </div>
      )}
    </aside>
  );
};

export default FilterPanel;
