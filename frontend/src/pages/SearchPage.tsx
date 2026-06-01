import { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowUpDown, Search, X } from 'lucide-react';
import CanvasSearch from '../components/CanvasSearch';
import KanjiList from '../components/KanjiList';
import LoadingState from '../components/LoadingState';
import type { AppOutletContext } from '../components/AppShell';
import { useKanjiSearchPageQuery, useRadicalGroupsQuery } from '../hooks/useKanjiQueries';
import type { RadicalGrouping, SearchMode, SortOrder } from '../types/kanji';
import './SearchPage.scss';

const modeLabels: Record<SearchMode, string> = {
  canvas: 'По рисунку',
  radicals: 'По радикалам',
};

const modeDescriptions: Record<SearchMode, string> = {
  canvas: 'Рисуйте знак на холсте, а ограничения справа сузят список кандидатов.',
  radicals: 'Выберите один или несколько радикалов: останутся кандзи, где есть каждый выбранный элемент.',
};

const modes = Object.keys(modeLabels) as SearchMode[];
const searchPageSize = 20;
const radicalFillDelayMs = 420;
const radicalReleaseDelayMs = 420;

const radicalGroupingOptions: Array<{ value: RadicalGrouping; label: string }> = [
  { value: 'usage', label: 'количеству' },
  { value: 'strokes', label: 'числу черт' },
];

const asMode = (value: string | undefined): SearchMode | null =>
  modes.includes(value as SearchMode) ? (value as SearchMode) : null;

const sameRadicals = (left: string[], right: string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const radicalGroupingLabel = (value: RadicalGrouping) =>
  radicalGroupingOptions.find((option) => option.value === value)?.label ?? value;

const RadicalGroupingSelector = ({
  value,
  onChange,
}: {
  value: RadicalGrouping;
  onChange: (value: RadicalGrouping) => void;
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div className="axis-selector radical-group-selector" ref={menuRef} onBlurCapture={handleBlur}>
      <span>по</span>
      <button className="axis-link" type="button" onClick={() => setOpen((current) => !current)}>
        {radicalGroupingLabel(value)}
      </button>
      {open ? (
        <div className="axis-menu">
          {radicalGroupingOptions.map((option) => (
            <button
              className={option.value === value ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SearchPage = () => {
  const params = useParams();
  const {
    filters,
    draftRadicals,
    setDraftRadicals,
    appliedRadicals,
    setAppliedRadicals,
    canvasStrokes,
    setCanvasStrokes,
  } =
    useOutletContext<AppOutletContext>();
  const mode = asMode(params.mode);
  const [text, setText] = useState('');
  const [radicalGrouping, setRadicalGrouping] = useState<RadicalGrouping>('usage');
  const [radicalSortOrder, setRadicalSortOrder] = useState<SortOrder>('desc');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const radicalGroupsQuery = useRadicalGroupsQuery(radicalGrouping, radicalSortOrder, mode === 'radicals');
  const radicalGroups = radicalGroupsQuery.data ?? [];
  const pendingAddedRadicals = useMemo(
    () => draftRadicals.filter((radical) => !appliedRadicals.includes(radical)),
    [appliedRadicals, draftRadicals],
  );
  const pendingRemovedRadicals = useMemo(
    () => appliedRadicals.filter((radical) => !draftRadicals.includes(radical)),
    [appliedRadicals, draftRadicals],
  );
  const pendingDelayMs = pendingAddedRadicals.length > 0 ? radicalFillDelayMs : radicalReleaseDelayMs;

  useEffect(() => {
    if (sameRadicals(draftRadicals, appliedRadicals)) {
      return undefined;
    }

    const delay = pendingAddedRadicals.length === 0 && pendingRemovedRadicals.length === 0 ? 0 : pendingDelayMs;
    const timeout = window.setTimeout(() => {
      setAppliedRadicals(draftRadicals);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [appliedRadicals, draftRadicals, pendingAddedRadicals.length, pendingDelayMs, pendingRemovedRadicals.length, setAppliedRadicals]);

  const searchCriteria = useMemo(
    () => ({ text, radicals: appliedRadicals, filters }),
    [appliedRadicals, filters, text],
  );
  const criteriaKey = JSON.stringify(searchCriteria);
  const page = pageState.key === criteriaKey ? pageState.page : 1;
  const resultsQuery = useKanjiSearchPageQuery(searchCriteria, page, searchPageSize, mode === 'radicals');

  if (!mode) {
    return <Navigate to="/search/canvas" replace />;
  }

  const handlePageChange = (nextPage: number) => {
    setPageState({ key: criteriaKey, page: nextPage });
  };

  const toggleRadical = (radical: string) => {
    setDraftRadicals((current) =>
      current.includes(radical) ? current.filter((item) => item !== radical) : [...current, radical],
    );
  };

  const radicalClassName = (radical: string) => {
    const isDraftSelected = draftRadicals.includes(radical);
    const isApplied = appliedRadicals.includes(radical);

    return [
      'radical-tile',
      isDraftSelected && isApplied ? 'selected' : '',
      isDraftSelected && !isApplied ? 'pending-selected' : '',
      !isDraftSelected && isApplied ? 'pending-removed' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const pageData = resultsQuery.data;
  const isInitialLoading = !pageData && (resultsQuery.isLoading || radicalGroupsQuery.isLoading);
  const isError = resultsQuery.isError || radicalGroupsQuery.isError;

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Поиск</p>
          <h1>{modeLabels[mode]}</h1>
          <p>{modeDescriptions[mode]}</p>
        </div>
      </section>

      {mode === 'canvas' ? (
        <CanvasSearch filters={filters} strokes={canvasStrokes} onStrokesChange={setCanvasStrokes} />
      ) : null}

      {mode === 'radicals' ? (
        <div className="search-grid radical-search-grid">
          <section className="control-panel" aria-label="Параметры поиска">
            <label className="search-field">
              <Search size={18} />
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Значение, чтение, слово..." />
            </label>

            <div className="section-heading radical-heading">
              <div className="radical-title">
                <h2>Радикалы</h2>
                <RadicalGroupingSelector value={radicalGrouping} onChange={setRadicalGrouping} />
              </div>
              <div className="radical-actions">
                {draftRadicals.length > 0 ? (
                  <button className="icon-button compact-icon" type="button" onClick={() => setDraftRadicals([])} aria-label="Сбросить радикалы">
                    <X size={16} />
                  </button>
                ) : (
                  <div className="heading-action-placeholder" aria-hidden="true" />
                )}
                <button
                  className={`icon-button compact-icon sort-icon ${radicalSortOrder}`}
                  type="button"
                  onClick={() => setRadicalSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))}
                  aria-label={radicalSortOrder === 'desc' ? 'Сортировка от большего к меньшему' : 'Сортировка от меньшего к большему'}
                  title={radicalSortOrder === 'desc' ? 'От большего к меньшему' : 'От меньшего к большему'}
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>
            </div>

            <div className="radical-groups">
              {radicalGroups.map((group) => (
                <section className="radical-group" key={group.id}>
                  <div className="radical-group-label">
                    <span>{group.label}</span>
                    <small>{group.count}</small>
                  </div>
                  <div className="radical-grid">
                    {group.radicals.map((radical) => (
                      <button
                        className={radicalClassName(radical._id)}
                        key={radical._id}
                        type="button"
                        aria-pressed={draftRadicals.includes(radical._id)}
                        onClick={() => toggleRadical(radical._id)}
                      >
                        <strong>{radical._id}</strong>
                        <span>{radical.kanji_list.length}</span>
                        <small>{radical.meaning}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          {isInitialLoading ? (
            <LoadingState label="Загружаем каталог" />
          ) : isError ? (
            <div className="empty-state">
              {resultsQuery.error?.message ?? radicalGroupsQuery.error?.message ?? 'Не удалось загрузить каталог.'}
            </div>
          ) : (
            <KanjiList
              items={(pageData?.items ?? []).map((kanji) => ({ kanji }))}
              title="Каталог"
              total={pageData?.total}
              page={pageData?.page}
              totalPages={pageData?.total_pages}
              isFetching={resultsQuery.isFetching}
              onPageChange={handlePageChange}
              emptyText="Под эти условия нет записей."
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPage;
