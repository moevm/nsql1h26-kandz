import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import LoadingState from '../components/LoadingState';
import { useAddKanjiMutation, useDatabaseQuery } from '../hooks/useKanjiQueries';
import type { KanjiDocument } from '../types/kanji';

const emptyForm = {
  literal: '',
  meanings: '',
  on: '',
  kun: '',
  radicals: '',
  strokeCount: '',
  grade: '',
  jlpt: '',
};

const DataPage = () => {
  const databaseQuery = useDatabaseQuery();
  const addMutation = useAddKanjiMutation();
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({
    literal: '',
    meaning: '',
    radical: '',
    strokeCount: '',
    grade: '',
  });
  const [page, setPage] = useState(1);

  const filteredKanji = useMemo(() => {
    const kanji = databaseQuery.data?.kanji ?? [];

    return kanji.filter((item) => {
      const literalOk = item.literal.includes(filters.literal.trim());
      const meaningOk = item.meanings.join(' ').toLowerCase().includes(filters.meaning.trim().toLowerCase());
      const radicalOk = item.radicals.join(' ').includes(filters.radical.trim());
      const strokeOk = filters.strokeCount ? item.stroke_count === Number(filters.strokeCount) : true;
      const gradeOk = filters.grade ? item.grade === Number(filters.grade) : true;

      return literalOk && meaningOk && radicalOk && strokeOk && gradeOk;
    });
  }, [databaseQuery.data, filters]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredKanji.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredKanji.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const literal = form.literal.trim();
    const strokeCount = Number(form.strokeCount);

    if (!literal || !Number.isFinite(strokeCount)) {
      return;
    }

    const kanji: KanjiDocument = {
      _id: literal,
      literal,
      unicode: literal.codePointAt(0)?.toString(16) ?? literal,
      stroke_count: strokeCount,
      grade: form.grade ? Number(form.grade) : null,
      jlpt: form.jlpt ? Number(form.jlpt) : null,
      freq: null,
      readings: {
        on: form.on.split(',').map((item) => item.trim()).filter(Boolean),
        kun: form.kun.split(',').map((item) => item.trim()).filter(Boolean),
        nanori: [],
      },
      meanings: form.meanings.split(',').map((item) => item.trim()).filter(Boolean),
      radicals: form.radicals.split(',').map((item) => item.trim()).filter(Boolean),
      words: [],
      example_sentences: [],
      kvg: null,
    };

    await addMutation.mutateAsync(kanji);
    setForm(emptyForm);
    setPage(1);
  };

  if (databaseQuery.isLoading) {
    return <LoadingState label="Открываем таблицы" />;
  }

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Database</p>
          <h1>Данные приложения</h1>
          <p>Учебная витрина коллекций MongoDB: просмотр, многокритериальная фильтрация и добавление кандзи.</p>
        </div>
      </section>

      <section className="data-layout">
        <form className="control-panel add-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>Новая запись</h2>
          </div>
          <label>
            Иероглиф
            <input value={form.literal} onChange={(event) => setForm({ ...form, literal: event.target.value })} maxLength={2} />
          </label>
          <label>
            Значения через запятую
            <input value={form.meanings} onChange={(event) => setForm({ ...form, meanings: event.target.value })} placeholder="road, way" />
          </label>
          <div className="field-row">
            <label>
              Черт
              <input inputMode="numeric" value={form.strokeCount} onChange={(event) => setForm({ ...form, strokeCount: event.target.value })} />
            </label>
            <label>
              Класс
              <input inputMode="numeric" value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} />
            </label>
          </div>
          <div className="field-row">
            <label>
              JLPT
              <input inputMode="numeric" value={form.jlpt} onChange={(event) => setForm({ ...form, jlpt: event.target.value })} />
            </label>
            <label>
              Радикалы
              <input value={form.radicals} onChange={(event) => setForm({ ...form, radicals: event.target.value })} placeholder="口, 言" />
            </label>
          </div>
          <label>
            On-чтения
            <input value={form.on} onChange={(event) => setForm({ ...form, on: event.target.value })} placeholder="ゴ" />
          </label>
          <label>
            Kun-чтения
            <input value={form.kun} onChange={(event) => setForm({ ...form, kun: event.target.value })} placeholder="みち" />
          </label>
          {addMutation.error ? <p className="error-text">{addMutation.error.message}</p> : null}
          <button className="filled-button" type="submit" disabled={addMutation.isPending}>
            <Plus size={18} />
            Добавить
          </button>
        </form>

        <section className="results-panel data-panel">
          <div className="section-heading">
            <h2>Коллекция kanji</h2>
            <span>{filteredKanji.length}</span>
          </div>
          <div className="table-filters">
            <input value={filters.literal} onChange={(event) => setFilters({ ...filters, literal: event.target.value })} placeholder="Иероглиф" />
            <input value={filters.meaning} onChange={(event) => setFilters({ ...filters, meaning: event.target.value })} placeholder="Meaning" />
            <input value={filters.radical} onChange={(event) => setFilters({ ...filters, radical: event.target.value })} placeholder="Радикал" />
            <input inputMode="numeric" value={filters.strokeCount} onChange={(event) => setFilters({ ...filters, strokeCount: event.target.value })} placeholder="Черт" />
            <input inputMode="numeric" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })} placeholder="Класс" />
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Кандзи</th>
                  <th>Значения</th>
                  <th>Черт</th>
                  <th>Класс</th>
                  <th>JLPT</th>
                  <th>Радикалы</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((kanji) => (
                  <tr key={kanji.literal}>
                    <td className="table-symbol">{kanji.literal}</td>
                    <td>{kanji.meanings.join(', ')}</td>
                    <td>{kanji.stroke_count ?? '—'}</td>
                    <td>{kanji.grade ?? '—'}</td>
                    <td>{kanji.jlpt ? `N${kanji.jlpt}` : '—'}</td>
                    <td>{kanji.radicals.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-row">
            <button className="text-button compact" type="button" disabled={currentPage === 1} onClick={() => setPage((value) => value - 1)}>
              Назад
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button className="text-button compact" type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => value + 1)}>
              Вперёд
            </button>
          </div>
        </section>
      </section>
    </div>
  );
};

export default DataPage;
