import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, FocusEvent, PointerEvent, SetStateAction } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

type RangeBound = 'from' | 'to';

const jlptOptions = ['5', '4', '3', '2', '1', 'none'];
const gradeOptions = ['1', '2', '3', '4', '5', '6', '8', 'none'];
const collapsedChipLineHeight = 32;

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
  activeBound,
  config,
  filters,
  onActivate,
  onDeactivate,
  update,
}: {
  activeBound: RangeBound | null;
  config: RangeFilterConfig;
  filters: GlobalFilters;
  onActivate: (bound: RangeBound) => void;
  onDeactivate: () => void;
  update: <Key extends keyof GlobalFilters>(key: Key, value: GlobalFilters[Key]) => void;
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const fromInputRef = useRef<HTMLInputElement | null>(null);
  const toInputRef = useRef<HTMLInputElement | null>(null);
  const pointerInsideRef = useRef(false);
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

  const updateBound = (bound: RangeBound, rawValue: string) => {
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
      if (pointerInsideRef.current) {
        return;
      }

      onDeactivate();
    }
  };

  const focusBound = (bound: RangeBound) => {
    window.requestAnimationFrame(() => {
      const input = bound === 'from' ? fromInputRef.current : toInputRef.current;
      input?.focus({ preventScroll: true });
    });
  };

  const handleBoundPointerDown = (event: PointerEvent<HTMLLabelElement>, bound: RangeBound) => {
    onActivate(bound);

    if (event.target !== (bound === 'from' ? fromInputRef.current : toInputRef.current)) {
      event.preventDefault();
    }

    focusBound(bound);
  };

  return (
    <section
      className="filter-section range-filter-section"
      ref={sectionRef}
      onBlurCapture={handleBlur}
      onPointerDownCapture={() => {
        pointerInsideRef.current = true;
        window.setTimeout(() => {
          pointerInsideRef.current = false;
        }, 0);
      }}
    >
      <h3>{config.title}</h3>
      <div className="filter-field-row">
        <label
          className={activeBound === 'from' ? 'range-bound-field active' : 'range-bound-field'}
          onPointerDown={(event) => handleBoundPointerDown(event, 'from')}
        >
          <span>От</span>
          <input
            ref={fromInputRef}
            inputMode="numeric"
            value={rawFrom}
            onChange={(event) => updateBound('from', event.target.value)}
            onFocus={() => {
              onActivate('from');
              focusBound('from');
            }}
            placeholder={config.fromPlaceholder}
          />
        </label>
        <label
          className={activeBound === 'to' ? 'range-bound-field active' : 'range-bound-field'}
          onPointerDown={(event) => handleBoundPointerDown(event, 'to')}
        >
          <span>До</span>
          <input
            ref={toInputRef}
            inputMode="numeric"
            value={rawTo}
            onChange={(event) => updateBound('to', event.target.value)}
            onFocus={() => {
              onActivate('to');
              focusBound('to');
            }}
            placeholder={config.toPlaceholder}
          />
        </label>
      </div>

      <AnimatePresence>
        {activeBound ? (
          <motion.div
            animate={{ height: 'auto', marginTop: 10, opacity: 1, y: 0 }}
            className="range-popover-motion"
            exit={{ height: 0, marginTop: 0, opacity: 0, y: -7 }}
            initial={{ height: 0, marginTop: 0, opacity: 0, y: -7 }}
            transition={{
              height: { type: 'spring', stiffness: 420, damping: 31, mass: 0.82 },
              marginTop: { duration: 0.18, ease: 'easeOut' },
              opacity: { duration: 0.14 },
              y: { type: 'spring', stiffness: 520, damping: 25, mass: 0.7 },
            }}
          >
            <motion.div
              animate={{ scaleY: 1 }}
              className="range-popover"
              exit={{ scaleY: 0.97, transition: { type: 'spring', stiffness: 520, damping: 18, bounce: 0.24 } }}
              initial={{ scaleY: 0.94 }}
              transition={{ type: 'spring', stiffness: 430, damping: 19, bounce: 0.28 }}
            >
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};

const FilterPanel = ({ collapsed, filters, onChange, onReset, onToggle }: FilterPanelProps) => {
  const selectedFilters = activeFilters(filters);
  const count = selectedFilters.length;
  const chipListRef = useRef<HTMLDivElement | null>(null);
  const [activeRange, setActiveRange] = useState<{ key: string; bound: RangeBound } | null>(null);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [chipsOverflow, setChipsOverflow] = useState(false);
  const chipSignature = selectedFilters.join('|');
  const chipsExpandedNow = chipsExpanded && chipsOverflow;

  useLayoutEffect(() => {
    const element = chipListRef.current;

    if (collapsed || !element || selectedFilters.length === 0) {
      return undefined;
    }

    let frame = 0;
    const measure = () => {
      frame = window.requestAnimationFrame(() => {
        setChipsOverflow(element.scrollHeight > collapsedChipLineHeight);
      });
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => {
        window.cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [chipSignature, collapsed, selectedFilters.length]);

  const update = <Key extends keyof GlobalFilters>(key: Key, value: GlobalFilters[Key]) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  const activateRange = (key: string, bound: RangeBound) => {
    setActiveRange((current) =>
      current?.key === key && current.bound === bound ? current : { key, bound },
    );
  };

  const deactivateRange = (key: string) => {
    setActiveRange((current) => (current?.key === key ? null : current));
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

          <div className="active-filter-slot">
            <AnimatePresence initial={false}>
              {selectedFilters.length > 0 ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className={[
                    'active-filter-row',
                    chipsExpandedNow ? 'expanded' : '',
                    chipsOverflow ? 'overflowing' : '',
                  ].filter(Boolean).join(' ')}
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                >
                  <div className="active-filter-list" ref={chipListRef} aria-label="Выбранные фильтры">
                    {selectedFilters.map((filter) => (
                      <span key={filter}>{filter}</span>
                    ))}
                  </div>
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    onClick={() => {
                      setChipsExpanded(false);
                      onReset();
                    }}
                    aria-label="Сбросить фильтры"
                    title="Сбросить фильтры"
                  >
                    <RotateCcw size={16} />
                  </button>
                  {chipsOverflow ? (
                    <motion.button
                      className={chipsExpandedNow ? 'chip-expand-button expanded' : 'chip-expand-button'}
                      type="button"
                      onClick={() => setChipsExpanded((value) => !value)}
                      aria-expanded={chipsExpandedNow}
                      aria-label={chipsExpandedNow ? 'Свернуть выбранные фильтры' : 'Показать все выбранные фильтры'}
                      animate={chipsExpandedNow ? { y: [0, 7, 7] } : { y: 0 }}
                      transition={
                        chipsExpandedNow
                          ? { duration: 0.26, ease: [0.25, 0, 0.95, 0.55], times: [0, 0.92, 1] }
                          : { duration: 0.14, ease: 'easeOut' }
                      }
                    >
                      <motion.span
                        animate={chipsExpandedNow ? { rotate: 180, y: 7 } : { rotate: 0, y: 0 }}
                        transition={
                          chipsExpandedNow
                            ? { delay: 0.28, duration: 0.12, ease: 'easeOut' }
                            : { duration: 0.12, ease: 'easeOut' }
                        }
                      >
                        <ChevronDown size={36} strokeWidth={1.55} style={{ transform: 'scaleX(1.85)' }} />
                      </motion.span>
                    </motion.button>
                  ) : null}
                </motion.div>
              ) : (
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="active-filter-placeholder"
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                >
                  здесь будут появляться фильтры...
                </motion.p>
              )}
            </AnimatePresence>
          </div>

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
