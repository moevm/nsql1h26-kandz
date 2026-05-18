import { useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileJson, LogIn, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImportDialog from '../components/ImportDialog';
import LoadingState from '../components/LoadingState';
import { useAddKanjiMutation, useAdminLoginMutation, useExportMutation, useKanjiPageQuery, useRadicalsQuery } from '../hooks/useKanjiQueries';
import type { KanjiDocument, KanjiTableFilters, RadicalDocument } from '../types/kanji';

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

const emptyFilters: KanjiTableFilters = {
  literal: '',
  meaning: '',
  radical: '',
  strokeCount: '',
  grade: '',
  jlpt: '',
};

const DataPage = () => {
  const navigate = useNavigate();
  const addMutation = useAddKanjiMutation();
  const loginMutation = useAdminLoginMutation();
  const exportMutation = useExportMutation();
  const radicalsQuery = useRadicalsQuery();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [filters, setFilters] = useState<KanjiTableFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminName, setAdminName] = useState('');
  const pageSize = 8;
  const tableQuery = useKanjiPageQuery(filters, page, pageSize);

  const pageData = tableQuery.data;
  const pageItems = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const currentPage = pageData?.page ?? page;
  const totalPages = pageData?.total_pages ?? 1;

  const updateFilter = (key: keyof KanjiTableFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync();
      setToast('Экспорт JSON начат.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось экспортировать данные.');
    }
  };

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const session = await loginMutation.mutateAsync({ username: adminUsername, password: adminPassword });
    setAdminToken(session.access_token);
    setAdminName(session.username);
    setAdminPassword('');
  };

  const resolveRadicals = (value: string, radicals: RadicalDocument[]) => {
    const normalizedRadicals = radicals.map((radical) => ({
      ...radical,
      meaning: radical.meaning?.toLowerCase() ?? '',
    }));

    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const lowered = item.toLowerCase();
            const match = normalizedRadicals.find(
              (radical) => radical._id === item || Boolean(radical.meaning && radical.meaning.includes(lowered)),
            );
            return match?._id ?? item;
          }),
      ),
    ];
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!adminToken) {
      setFormError('Для добавления записи нужен вход администратора.');
      return;
    }

    const literal = form.literal.trim();
    const strokeCount = Number(form.strokeCount);
    const meanings = form.meanings
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!literal || meanings.length === 0 || !Number.isFinite(strokeCount)) {
      setFormError('Заполните иероглиф, значения и число черт.');
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
      meanings,
      radicals: resolveRadicals(form.radicals, radicalsQuery.data ?? []),
      words: [],
      example_sentences: [],
      kvg: null,
    };

    await addMutation.mutateAsync({ kanji, token: adminToken });
    setForm(emptyForm);
    setPage(1);
  };

  const openKanji = (literal: string) => {
    navigate(`/kanji/${encodeURIComponent(literal)}`);
  };

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Данные</p>
          <h1>Каталог кандзи</h1>
          <p>Записи базы, фильтры по полям и добавление новых иероглифов.</p>
        </div>
        <div className="hero-actions">
          <button className="text-button" type="button" onClick={handleExport} disabled={exportMutation.isPending} aria-label="Экспортировать данные">
            <Download size={18} />
            Экспорт
          </button>
          <button
            className="filled-button"
            type="button"
            onClick={() => {
              setFormError(adminToken ? '' : 'Для импорта нужен вход администратора.');
              setImportOpen(true);
            }}
            aria-label="Импортировать данные"
          >
            <FileJson size={18} />
            Импорт
          </button>
        </div>
      </section>

      <section className="data-layout">
        <form className="control-panel add-form" onSubmit={adminToken ? handleSubmit : handleAdminLogin}>
          <div className="section-heading">
            <h2>Новая запись</h2>
            {adminToken ? <span>{adminName}</span> : null}
          </div>
          {!adminToken ? (
            <>
              <p className="muted-copy">Войдите один раз, чтобы добавлять записи и импортировать JSON.</p>
              <label>
                Логин
                <input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} autoComplete="username" />
              </label>
              <label>
                Пароль
                <input value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="admin123" />
              </label>
              {formError ? <p className="error-text">{formError}</p> : null}
              {loginMutation.error ? <p className="error-text">{loginMutation.error.message}</p> : null}
              <button className="filled-button" type="submit" disabled={loginMutation.isPending}>
                <LogIn size={18} />
                Войти
              </button>
            </>
          ) : (
            <>
              <button
                className="text-button compact"
                type="button"
                onClick={() => {
                  setAdminToken('');
                  setAdminName('');
                }}
              >
                <LogOut size={16} />
                Выйти
              </button>
              <label>
                Иероглиф
                <input value={form.literal} onChange={(event) => setForm({ ...form, literal: event.target.value })} maxLength={2} placeholder="道" />
              </label>
              <label>
                Значения через запятую
                <input value={form.meanings} onChange={(event) => setForm({ ...form, meanings: event.target.value })} placeholder="road, way" />
              </label>
              <div className="field-row">
                <label>
                  Черт
                  <input inputMode="numeric" value={form.strokeCount} onChange={(event) => setForm({ ...form, strokeCount: event.target.value })} placeholder="12" />
                </label>
                <label>
                  Класс
                  <input inputMode="numeric" value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} placeholder="2" />
                </label>
              </div>
              <div className="field-row">
                <label>
                  JLPT
                  <input inputMode="numeric" value={form.jlpt} onChange={(event) => setForm({ ...form, jlpt: event.target.value })} placeholder="4" />
                </label>
                <label>
                  Радикалы
                  <input value={form.radicals} onChange={(event) => setForm({ ...form, radicals: event.target.value })} placeholder="口, 言 или くち" />
                </label>
              </div>
              <label>
                On-чтения
                <input value={form.on} onChange={(event) => setForm({ ...form, on: event.target.value })} placeholder="ドウ, トウ" />
              </label>
              <label>
                Kun-чтения
                <input value={form.kun} onChange={(event) => setForm({ ...form, kun: event.target.value })} placeholder="みち" />
              </label>
              {formError ? <p className="error-text">{formError}</p> : null}
              {addMutation.error ? <p className="error-text">{addMutation.error.message}</p> : null}
              <button className="filled-button" type="submit" disabled={addMutation.isPending}>
                <Plus size={18} />
                Добавить
              </button>
            </>
          )}
        </form>

        <section className="results-panel data-panel">
          <div className="section-heading">
            <h2>Коллекция kanji</h2>
            <span>{total}</span>
          </div>
          <div className="table-filters">
            <input value={filters.literal} onChange={(event) => updateFilter('literal', event.target.value)} placeholder="Иероглиф" />
            <input value={filters.meaning} onChange={(event) => updateFilter('meaning', event.target.value)} placeholder="Значение" />
            <input value={filters.radical} onChange={(event) => updateFilter('radical', event.target.value)} placeholder="Радикал или чтение" />
            <input inputMode="numeric" value={filters.strokeCount} onChange={(event) => updateFilter('strokeCount', event.target.value)} placeholder="Черт" />
            <input inputMode="numeric" value={filters.grade} onChange={(event) => updateFilter('grade', event.target.value)} placeholder="Класс" />
            <input inputMode="numeric" value={filters.jlpt} onChange={(event) => updateFilter('jlpt', event.target.value)} placeholder="JLPT" />
          </div>

          {tableQuery.isLoading ? <LoadingState label="Открываем таблицу" /> : null}
          {tableQuery.isError ? <div className="empty-state">{tableQuery.error.message}</div> : null}

          {!tableQuery.isLoading && !tableQuery.isError ? (
            <>
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
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">По этим условиям записей нет.</div>
                        </td>
                      </tr>
                    ) : null}
                    {pageItems.map((kanji) => (
                      <tr
                        className="clickable-row"
                        key={kanji.literal}
                        tabIndex={0}
                        role="link"
                        onClick={() => openKanji(kanji.literal)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openKanji(kanji.literal);
                          }
                        }}
                      >
                        <td className="table-symbol">
                          <span className="table-link">
                            {kanji.literal}
                          </span>
                        </td>
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
                <button className="text-button compact" type="button" disabled={currentPage === 1 || tableQuery.isFetching} onClick={() => setPage((value) => value - 1)}>
                  Назад
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button className="text-button compact" type="button" disabled={currentPage === totalPages || tableQuery.isFetching} onClick={() => setPage((value) => value + 1)}>
                  Вперёд
                </button>
              </div>
            </>
          ) : null}
        </section>
      </section>

      <ImportDialog
        open={importOpen}
        adminToken={adminToken}
        onClose={() => setImportOpen(false)}
        onImported={(message) => setToast(message)}
      />

      {toast ? (
        <div className="snackbar" role="status" onAnimationEnd={() => setToast('')}>
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default DataPage;
