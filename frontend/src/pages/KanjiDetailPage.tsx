import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowLeft, Pencil, Play, Save, X } from 'lucide-react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppOutletContext } from '../components/AppShell';
import LoadingState from '../components/LoadingState';
import { useKanjiDetailQuery, useUpdateKanjiMutation } from '../hooks/useKanjiQueries';
import type { KanjiDocument } from '../types/kanji';

const splitValues = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const emptyStrokePaths: string[] = [];

const StrokeOrderDialog = ({
  kanji,
  open,
  onClose,
}: {
  kanji: KanjiDocument;
  open: boolean;
  onClose: () => void;
}) => {
  const [replayKey, setReplayKey] = useState(0);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [timings, setTimings] = useState<{ length: number; duration: number; delay: number }[]>([]);
  const paths = kanji.kvg?.stroke_paths ?? emptyStrokePaths;

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    let delay = 0;
    const nextTimings = paths.map((_, index) => {
      const length = Math.max(1, pathRefs.current[index]?.getTotalLength() ?? 100);
      const duration = Math.max(0.3, Math.min(1.05, length / 125));
      const timing = { length, duration, delay };
      delay += duration + 0.12;
      return timing;
    });

    setTimings(nextTimings);
  }, [open, paths, replayKey]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Порядок черт">
      <div className="modal-sheet">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Порядок черт</p>
            <h2>{kanji.literal}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть порядок черт">
            <X size={20} />
          </button>
        </div>

        {paths.length === 0 ? (
          <div className="empty-state">SVG-данные для этого иероглифа отсутствуют.</div>
        ) : (
          <button className="stroke-player" type="button" onClick={() => setReplayKey((value) => value + 1)}>
            <svg key={replayKey} viewBox="0 0 100 100" aria-label={`Анимация написания ${kanji.literal}`}>
              {paths.map((path, index) => (
                <path
                  d={path}
                  key={`${path}-${index}`}
                  ref={(element) => {
                    pathRefs.current[index] = element;
                  }}
                  style={
                    {
                      '--stroke-length': timings[index]?.length ?? 100,
                      '--stroke-duration': `${timings[index]?.duration ?? 0.6}s`,
                      '--stroke-delay': `${timings[index]?.delay ?? 0}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </svg>
            <span>Нажмите, чтобы запустить заново</span>
          </button>
        )}
      </div>
    </div>
  );
};

const KanjiEditDialog = ({
  kanji,
  adminToken,
  onClose,
}: {
  kanji: KanjiDocument;
  adminToken: string;
  onClose: () => void;
}) => {
  const updateMutation = useUpdateKanjiMutation();
  const [localError, setLocalError] = useState('');
  const [draft, setDraft] = useState({
    meanings: kanji.meanings.join(', '),
    on: kanji.readings.on.join(', '),
    kun: kanji.readings.kun.join(', '),
    nanori: kanji.readings.nanori.join(', '),
    radicals: kanji.radicals.join(', '),
    strokeCount: String(kanji.stroke_count ?? ''),
    grade: String(kanji.grade ?? ''),
    jlpt: String(kanji.jlpt ?? ''),
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');

    if (!adminToken) {
      setLocalError('Для редактирования нужен вход администратора.');
      return;
    }

    const updated: KanjiDocument = {
      ...kanji,
      stroke_count: draft.strokeCount ? Number(draft.strokeCount) : null,
      grade: draft.grade ? Number(draft.grade) : null,
      jlpt: draft.jlpt ? Number(draft.jlpt) : null,
      readings: {
        on: splitValues(draft.on),
        kun: splitValues(draft.kun),
        nanori: splitValues(draft.nanori),
      },
      meanings: splitValues(draft.meanings),
      radicals: splitValues(draft.radicals),
    };

    await updateMutation.mutateAsync({ literal: kanji.literal, kanji: updated, token: adminToken });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Редактирование кандзи">
      <div className="modal-sheet">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Редактирование</p>
            <h2>{kanji.literal}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть редактирование">
            <X size={20} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Значения
            <input value={draft.meanings} onChange={(event) => setDraft({ ...draft, meanings: event.target.value })} />
          </label>
          <div className="field-row">
            <label>
              Черт
              <input inputMode="numeric" value={draft.strokeCount} onChange={(event) => setDraft({ ...draft, strokeCount: event.target.value })} />
            </label>
            <label>
              Класс
              <input inputMode="numeric" value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
            </label>
          </div>
          <div className="field-row">
            <label>
              JLPT
              <input inputMode="numeric" value={draft.jlpt} onChange={(event) => setDraft({ ...draft, jlpt: event.target.value })} />
            </label>
            <label>
              Радикалы
              <input value={draft.radicals} onChange={(event) => setDraft({ ...draft, radicals: event.target.value })} />
            </label>
          </div>
          <label>
            On-чтения
            <input value={draft.on} onChange={(event) => setDraft({ ...draft, on: event.target.value })} />
          </label>
          <label>
            Kun-чтения
            <input value={draft.kun} onChange={(event) => setDraft({ ...draft, kun: event.target.value })} />
          </label>
          <label>
            Nanori
            <input value={draft.nanori} onChange={(event) => setDraft({ ...draft, nanori: event.target.value })} />
          </label>

          {localError ? <p className="error-text">{localError}</p> : null}
          {updateMutation.error ? <p className="error-text">{updateMutation.error.message}</p> : null}
          <button className="filled-button" type="submit" disabled={updateMutation.isPending}>
            <Save size={18} />
            Сохранить
          </button>
        </form>
      </div>
    </div>
  );
};

const KanjiDetailPage = () => {
  const { literal } = useParams();
  const navigate = useNavigate();
  const { adminToken } = useOutletContext<AppOutletContext>();
  const decodedLiteral = literal ? decodeURIComponent(literal) : '';
  const query = useKanjiDetailQuery(decodedLiteral);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [decodedLiteral]);

  if (query.isLoading) {
    return <LoadingState label="Открываем карточку" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="page-stack">
        <button className="text-button back-link" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Назад
        </button>
        <div className="empty-state">Иероглиф не найден в базе данных.</div>
      </div>
    );
  }

  const kanji = query.data;
  const hasStrokePaths = Boolean(kanji.kvg?.stroke_paths?.length);
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/search/canvas');
  };

  return (
    <div className="detail-page">
      <button className="text-button back-link" type="button" onClick={handleBack}>
        <ArrowLeft size={18} />
        Назад
      </button>

      <section className="detail-hero">
        <div className="detail-symbol">{kanji.literal}</div>
        <div className="detail-summary">
          <p className="eyebrow">Карточка кандзи</p>
          <h1>{kanji.meanings.join(', ')}</h1>
          <div className="meta-line">
            <span>{kanji.stroke_count ?? '—'} черт</span>
            <span>{kanji.grade ? `${kanji.grade} класс` : 'вне школьной программы'}</span>
            <span>{kanji.jlpt ? `JLPT N${kanji.jlpt}` : 'без JLPT'}</span>
          </div>
          <div className="detail-actions">
            <button
              className="tonal-button"
              type="button"
              onClick={() => setEditOpen(true)}
              disabled={!adminToken}
              title={!adminToken ? 'Для редактирования нужен вход администратора' : undefined}
            >
              <Pencil size={18} />
              Редактировать
            </button>
            <button className="filled-button" type="button" onClick={() => setStrokeOpen(true)} disabled={!hasStrokePaths}>
              <Play size={18} />
              Порядок черт
            </button>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <div className="info-section">
          <h2>Чтения</h2>
          <dl className="definition-list">
            <div>
              <dt>On</dt>
              <dd>{kanji.readings.on.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Kun</dt>
              <dd>{kanji.readings.kun.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Nanori</dt>
              <dd>{kanji.readings.nanori.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Радикалы</dt>
              <dd>{kanji.radicals.join(' · ')}</dd>
            </div>
          </dl>
        </div>

        <div className="info-section">
          <h2>Слова</h2>
          <div className="word-list">
            {kanji.words.length === 0 ? <div className="empty-state">Слов пока нет.</div> : null}
            {kanji.words.map((word) => (
              <article className="word-row" key={`${word.word}-${word.reading}`}>
                <strong>{word.word}</strong>
                <span>{word.reading}</span>
                <small>{word.meanings.join(', ')}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="info-section wide-section">
          <h2>Примеры предложений</h2>
          <div className="sentence-list">
            {kanji.example_sentences.length === 0 ? <div className="empty-state">Примеров пока нет.</div> : null}
            {kanji.example_sentences.map((sentence) => (
              <article className="sentence-row" key={`${sentence.japanese}-${sentence.english}`}>
                <strong>{sentence.japanese}</strong>
                <span>{sentence.english}</span>
                <small>{sentence.source}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <StrokeOrderDialog kanji={kanji} open={strokeOpen} onClose={() => setStrokeOpen(false)} />
      {editOpen ? <KanjiEditDialog kanji={kanji} adminToken={adminToken} onClose={() => setEditOpen(false)} /> : null}
    </div>
  );
};

export default KanjiDetailPage;
