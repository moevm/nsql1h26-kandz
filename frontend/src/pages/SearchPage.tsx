import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import CanvasSearch from '../components/CanvasSearch';
import KanjiList from '../components/KanjiList';
import LoadingState from '../components/LoadingState';
import type { AppOutletContext } from '../components/AppShell';
import { useKanjiSearchPageQuery, useRadicalsQuery } from '../hooks/useKanjiQueries';
import type { SearchMode } from '../types/kanji';

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

const asMode = (value: string | undefined): SearchMode | null =>
  modes.includes(value as SearchMode) ? (value as SearchMode) : null;

const sameRadicals = (left: string[], right: string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const SearchPage = () => {
  const params = useParams();
  const { filters } = useOutletContext<AppOutletContext>();
  const mode = asMode(params.mode);
  const [text, setText] = useState('');
  const [draftRadicals, setDraftRadicals] = useState<string[]>([]);
  const [appliedRadicals, setAppliedRadicals] = useState<string[]>([]);
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const completedRadicalsRef = useRef(new Set<string>());
  const radicalsQuery = useRadicalsQuery();
  const pendingRadicals = useMemo(
    () => [
      ...draftRadicals.filter((radical) => !appliedRadicals.includes(radical)),
      ...appliedRadicals.filter((radical) => !draftRadicals.includes(radical)),
    ],
    [appliedRadicals, draftRadicals],
  );
  const pendingRadicalsKey = pendingRadicals.join('\u001f');

  useEffect(() => {
    completedRadicalsRef.current = new Set(
      [...completedRadicalsRef.current].filter((radical) => pendingRadicals.includes(radical)),
    );

    if (sameRadicals(draftRadicals, appliedRadicals)) {
      completedRadicalsRef.current.clear();
      return undefined;
    }

    if (pendingRadicals.length === 0) {
      setAppliedRadicals(draftRadicals);
      completedRadicalsRef.current.clear();
    }

    if (
      pendingRadicals.length > 0 &&
      pendingRadicals.every((radical) => completedRadicalsRef.current.has(radical))
    ) {
      setAppliedRadicals(draftRadicals);
      completedRadicalsRef.current.clear();
    }

    return undefined;
  }, [appliedRadicals, draftRadicals, pendingRadicals, pendingRadicalsKey]);

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

  const handleRadicalAnimationEnd = (radical: string, animationName: string) => {
    if (!['radical-commit-fill', 'radical-release'].includes(animationName) || !pendingRadicals.includes(radical)) {
      return;
    }

    completedRadicalsRef.current.add(radical);

    if (pendingRadicals.every((item) => completedRadicalsRef.current.has(item))) {
      completedRadicalsRef.current.clear();
      setAppliedRadicals(draftRadicals);
    }
  };

  const pageData = resultsQuery.data;
  const isInitialLoading = !pageData && (resultsQuery.isLoading || radicalsQuery.isLoading);
  const isError = resultsQuery.isError || radicalsQuery.isError;

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Поиск</p>
          <h1>{modeLabels[mode]}</h1>
          <p>{modeDescriptions[mode]}</p>
        </div>
      </section>

      {mode === 'canvas' ? <CanvasSearch filters={filters} /> : null}

      {mode === 'radicals' ? (
        <div className="search-grid radical-search-grid">
          <section className="control-panel" aria-label="Параметры поиска">
            <label className="search-field">
              <Search size={18} />
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Значение, чтение, слово..." />
            </label>

            <div className="section-heading radical-heading">
              <h2>Радикалы</h2>
              {draftRadicals.length > 0 ? (
                <button className="icon-button compact-icon" type="button" onClick={() => setDraftRadicals([])} aria-label="Сбросить радикалы">
                  <X size={16} />
                </button>
              ) : (
                <div className="heading-action-placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="radical-grid">
              {radicalsQuery.data?.map((radical) => (
                <button
                  className={radicalClassName(radical._id)}
                  key={radical._id}
                  type="button"
                  aria-pressed={draftRadicals.includes(radical._id)}
                  onAnimationEnd={(event) => handleRadicalAnimationEnd(radical._id, event.animationName)}
                  onClick={() => toggleRadical(radical._id)}
                >
                  <strong>{radical._id}</strong>
                  <span>{radical.kanji_list.length}</span>
                  <small>{radical.meaning}</small>
                </button>
              ))}
            </div>
          </section>

          {isInitialLoading ? (
            <LoadingState label="Загружаем каталог" />
          ) : isError ? (
            <div className="empty-state">
              {resultsQuery.error?.message ?? radicalsQuery.error?.message ?? 'Не удалось загрузить каталог.'}
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
