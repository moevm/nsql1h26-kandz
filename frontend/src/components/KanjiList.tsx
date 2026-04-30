import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { KanjiDocument } from '../types/kanji';

interface KanjiListItem {
  kanji: KanjiDocument;
  score?: number;
}

interface KanjiListProps {
  items: KanjiListItem[];
  title?: string;
  emptyText?: string;
}

const formatMeta = (kanji: KanjiDocument) => {
  const strokes = kanji.stroke_count ? `${kanji.stroke_count} черт` : 'черт нет';
  const grade = kanji.grade ? `${kanji.grade} класс` : 'вне школы';
  const jlpt = kanji.jlpt ? `JLPT N${kanji.jlpt}` : 'без JLPT';

  return `${strokes} · ${grade} · ${jlpt}`;
};

const KanjiList = ({ items, title = 'Результаты', emptyText = 'Ничего не найдено' }: KanjiListProps) => (
  <section className="results-panel" aria-label={title}>
    <div className="section-heading">
      <h2>{title}</h2>
      <span>{items.length}</span>
    </div>

    {items.length === 0 ? (
      <div className="empty-state">{emptyText}</div>
    ) : (
      <div className="result-list">
        {items.map(({ kanji, score }) => (
          <Link to={`/kanji/${encodeURIComponent(kanji.literal)}`} className="kanji-row" key={kanji.literal}>
            <span className="kanji-symbol">{kanji.literal}</span>
            <span className="kanji-row-body">
              <strong>{kanji.meanings.join(', ')}</strong>
              <small>{formatMeta(kanji)}</small>
              <small>{[...kanji.readings.on, ...kanji.readings.kun].join(' · ')}</small>
            </span>
            {score ? <span className="score-pill">{Math.round(score)}%</span> : null}
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    )}
  </section>
);

export default KanjiList;
