import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { KanjiDocument } from '../types/kanji';
import './KanjiList.scss';

interface KanjiListItem {
  kanji: KanjiDocument;
  score?: number;
}

interface KanjiListProps {
  items: KanjiListItem[];
  title?: string;
  emptyText?: string;
  total?: number;
  page?: number;
  totalPages?: number;
  isFetching?: boolean;
  onPageChange?: (page: number) => void;
}

const formatMeta = (kanji: KanjiDocument) => {
  const strokes = kanji.stroke_count ? `${kanji.stroke_count} черт` : 'черт нет';
  const grade = kanji.grade ? `${kanji.grade} класс` : 'вне школы';
  const jlpt = kanji.jlpt ? `JLPT N${kanji.jlpt}` : 'без JLPT';

  return `${strokes} · ${grade} · ${jlpt}`;
};

const KanjiList = ({
  items,
  title = 'Результаты',
  emptyText = 'Ничего не найдено',
  total,
  page,
  totalPages,
  isFetching = false,
  onPageChange,
}: KanjiListProps) => (
  <section className={isFetching ? 'results-panel updating' : 'results-panel'} aria-busy={isFetching} aria-label={title}>
    <div className="section-heading">
      <h2>{title}</h2>
      <span>{total ?? items.length}</span>
    </div>

    {items.length === 0 ? (
      <div className="empty-state">{emptyText}</div>
    ) : (
      <div className="result-list">
        {items.map(({ kanji }) => (
          <Link to={`/kanji/${encodeURIComponent(kanji.literal)}`} className="kanji-row" key={kanji.literal}>
            <span className="kanji-symbol">{kanji.literal}</span>
            <span className="kanji-row-body">
              <strong>{kanji.meanings.join(', ')}</strong>
              <small>{formatMeta(kanji)}</small>
              <small>{[...kanji.readings.on, ...kanji.readings.kun].join(' · ')}</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    )}

    {onPageChange && page && totalPages && totalPages > 1 ? (
      <div className="pagination-row">
        <button className="text-button compact" type="button" disabled={page === 1 || isFetching} onClick={() => onPageChange(page - 1)}>
          Назад
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button className="text-button compact" type="button" disabled={page === totalPages || isFetching} onClick={() => onPageChange(page + 1)}>
          Вперёд
        </button>
      </div>
    ) : null}
  </section>
);

export default KanjiList;
