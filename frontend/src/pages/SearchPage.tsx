import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import CanvasSearch from '../components/CanvasSearch';
import KanjiList from '../components/KanjiList';
import LoadingState from '../components/LoadingState';
import type { AppOutletContext } from '../components/AppShell';
import { useKanjiSearchQuery, useRadicalsQuery } from '../hooks/useKanjiQueries';
import type { SearchMode } from '../types/kanji';

const modeLabels: Record<SearchMode, string> = {
  canvas: 'Kanji Search',
  radicals: 'Radical Search',
  strokes: 'Stroke Count Search',
  school: 'School Year Search',
};

const modeDescriptions: Record<SearchMode, string> = {
  canvas: 'Рукописный ввод с автоматическим списком похожих иероглифов.',
  radicals: 'Выберите один или несколько радикалов: результат содержит каждый выбранный элемент.',
  strokes: 'Найдите кандзи по точному числу черт.',
  school: 'Отберите кандзи по школьному году или уровню JLPT.',
};

const modes = Object.keys(modeLabels) as SearchMode[];
const strokeOptions = Array.from({ length: 16 }, (_, index) => index + 1);
const gradeOptions = [1, 2, 3, 4, 5, 6, 8];
const jlptOptions = [5, 4, 3, 2, 1];

const asMode = (value: string | undefined): SearchMode | null =>
  modes.includes(value as SearchMode) ? (value as SearchMode) : null;

const SearchPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { filters, openFilters } = useOutletContext<AppOutletContext>();
  const mode = asMode(params.mode);
  const [text, setText] = useState('');
  const [selectedRadicals, setSelectedRadicals] = useState<string[]>([]);
  const [strokeCount, setStrokeCount] = useState<number | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [jlpt, setJlpt] = useState<number | null>(null);
  const radicalsQuery = useRadicalsQuery();

  const searchCriteria = useMemo(() => {
    if (mode === 'radicals') {
      return { text, radicals: selectedRadicals, filters };
    }

    if (mode === 'strokes') {
      return { text, strokeCount, filters };
    }

    if (mode === 'school') {
      return { text, grade, jlpt, filters };
    }

    return { text, filters };
  }, [filters, grade, jlpt, mode, selectedRadicals, strokeCount, text]);

  const resultsQuery = useKanjiSearchQuery(searchCriteria);

  if (!mode) {
    return <Navigate to="/search/canvas" replace />;
  }

  const handleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    navigate(`/search/${event.target.value}`);
  };

  const toggleRadical = (radical: string) => {
    setSelectedRadicals((current) =>
      current.includes(radical) ? current.filter((item) => item !== radical) : [...current, radical],
    );
  };

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Search</p>
          <h1>{modeLabels[mode]}</h1>
          <p>{modeDescriptions[mode]}</p>
        </div>
        <div className="hero-controls">
          <label className="select-field">
            Mode
            <select value={mode} onChange={handleModeChange}>
              {modes.map((item) => (
                <option value={item} key={item}>
                  {modeLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <button className="tonal-button" type="button" onClick={openFilters}>
            <SlidersHorizontal size={18} />
            Global filters
          </button>
        </div>
      </section>

      {mode === 'canvas' ? <CanvasSearch filters={filters} /> : null}

      {mode !== 'canvas' ? (
        <div className="search-grid">
          <section className="control-panel" aria-label="Параметры поиска">
            <label className="search-field">
              <Search size={18} />
              <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Значение, чтение, слово..." />
            </label>

            {mode === 'radicals' ? (
              <>
                <div className="section-heading">
                  <h2>Радикалы</h2>
                  <button className="text-button compact" type="button" onClick={() => setSelectedRadicals([])}>
                    Очистить
                  </button>
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
              </>
            ) : null}

            {mode === 'strokes' ? (
              <>
                <div className="section-heading">
                  <h2>Число черт</h2>
                  <button className="text-button compact" type="button" onClick={() => setStrokeCount(null)}>
                    Любое
                  </button>
                </div>
                <div className="number-grid">
                  {strokeOptions.map((count) => (
                    <button
                      className={strokeCount === count ? 'number-tile selected' : 'number-tile'}
                      key={count}
                      type="button"
                      onClick={() => setStrokeCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {mode === 'school' ? (
              <div className="school-controls">
                <div>
                  <div className="section-heading">
                    <h2>Класс</h2>
                    <button className="text-button compact" type="button" onClick={() => setGrade(null)}>
                      Любой
                    </button>
                  </div>
                  <div className="chip-grid">
                    {gradeOptions.map((item) => (
                      <button
                        className={grade === item ? 'filter-chip selected' : 'filter-chip'}
                        key={item}
                        type="button"
                        onClick={() => {
                          setGrade(item);
                          setJlpt(null);
                        }}
                      >
                        {item} класс
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="section-heading">
                    <h2>JLPT</h2>
                    <button className="text-button compact" type="button" onClick={() => setJlpt(null)}>
                      Любой
                    </button>
                  </div>
                  <div className="chip-grid">
                    {jlptOptions.map((item) => (
                      <button
                        className={jlpt === item ? 'filter-chip selected' : 'filter-chip'}
                        key={item}
                        type="button"
                        onClick={() => {
                          setJlpt(item);
                          setGrade(null);
                        }}
                      >
                        N{item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {resultsQuery.isLoading || radicalsQuery.isLoading ? (
            <LoadingState label="Загружаем каталог" />
          ) : (
            <KanjiList
              items={(resultsQuery.data ?? []).map((kanji) => ({ kanji }))}
              title="Каталог"
              emptyText="Под эти условия нет записей."
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPage;
