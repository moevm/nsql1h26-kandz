import { useState } from 'react';
import { ArrowLeft, Play, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { useKanjiDetailQuery } from '../hooks/useKanjiQueries';
import type { KanjiDocument } from '../types/kanji';

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

  if (!open) {
    return null;
  }

  const paths = kanji.kvg?.stroke_paths ?? [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Порядок черт">
      <div className="modal-sheet">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Stroke order</p>
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
                  pathLength="100"
                  style={{ animationDelay: `${index * 0.34}s` }}
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

const KanjiDetailPage = () => {
  const { literal } = useParams();
  const decodedLiteral = literal ? decodeURIComponent(literal) : '';
  const query = useKanjiDetailQuery(decodedLiteral);
  const [strokeOpen, setStrokeOpen] = useState(false);

  if (query.isLoading) {
    return <LoadingState label="Открываем карточку" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="page-stack">
        <Link to="/search/canvas" className="text-button">
          <ArrowLeft size={18} />
          Вернуться к поиску
        </Link>
        <div className="empty-state">Иероглиф не найден в базе данных.</div>
      </div>
    );
  }

  const kanji = query.data;

  return (
    <div className="detail-page">
      <Link to="/search/canvas" className="text-button back-link">
        <ArrowLeft size={18} />
        К поиску
      </Link>

      <section className="detail-hero">
        <div className="detail-symbol">{kanji.literal}</div>
        <div className="detail-summary">
          <p className="eyebrow">Kanji card</p>
          <h1>{kanji.meanings.join(', ')}</h1>
          <div className="meta-line">
            <span>{kanji.stroke_count ?? '—'} черт</span>
            <span>{kanji.grade ? `${kanji.grade} класс` : 'вне школьной программы'}</span>
            <span>{kanji.jlpt ? `JLPT N${kanji.jlpt}` : 'без JLPT'}</span>
          </div>
          <button className="filled-button" type="button" onClick={() => setStrokeOpen(true)}>
            <Play size={18} />
            Порядок черт
          </button>
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
    </div>
  );
};

export default KanjiDetailPage;
