import { useMemo, useState } from 'react';
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

const SearchPage = () => {
  const params = useParams();
  const { filters } = useOutletContext<AppOutletContext>();
  const mode = asMode(params.mode);
  const [text, setText] = useState('');
  const [selectedRadicals, setSelectedRadicals] = useState<string[]>([]);
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const radicalsQuery = useRadicalsQuery();

  const searchCriteria = useMemo(
    () => ({ text, radicals: selectedRadicals, filters }),
    [filters, selectedRadicals, text],
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
    setSelectedRadicals((current) =>
      current.includes(radical) ? current.filter((item) => item !== radical) : [...current, radical],
    );
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
              {selectedRadicals.length > 0 ? (
                <button className="icon-button compact-icon" type="button" onClick={() => setSelectedRadicals([])} aria-label="Сбросить радикалы">
                  <X size={16} />
                </button>
              ) : (
                <div className="heading-action-placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="radical-grid">
              {radicalsQuery.data?.map((radical) => (
                <button
                  className={selectedRadicals.includes(radical._id) ? 'radical-tile selected' : 'radical-tile'}
                  key={radical._id}
                  type="button"
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
