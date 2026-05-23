import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { CornerUpLeft, Eraser, Sparkles } from 'lucide-react';
import { StrokeRecognizer } from 'kanji-recognizer';
import { useKanjiSearchQuery } from '../hooks/useKanjiQueries';
import type { GlobalFilters, KanjiDocument, Point, RecognitionCandidate } from '../types/kanji';
import KanjiList from './KanjiList';
import LoadingState from './LoadingState';

interface CanvasSearchProps {
  filters: GlobalFilters;
}

const STORAGE_KEY = 'kanji-lookup-canvas-strokes';

const readSavedStrokes = (): Point[][] => {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeStrokes = (strokes: Point[][], targetSize = 100, padding = 6): Point[][] => {
  const points = strokes.flat();
  if (points.length === 0) {
    return strokes;
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const usableSize = Math.max(1, targetSize - padding * 2);
  const scale = usableSize / Math.max(width, height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = padding + (usableSize - scaledWidth) / 2;
  const offsetY = padding + (usableSize - scaledHeight) / 2;

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: (point.x - minX) * scale + offsetX,
      y: (point.y - minY) * scale + offsetY,
    })),
  );
};

const scoreCandidate = (recognizer: StrokeRecognizer, strokes: Point[][], kanji: KanjiDocument): number => {
  const targetPaths = kanji.kvg?.stroke_paths ?? [];
  if (targetPaths.length === 0 || strokes.length === 0) {
    return Infinity;
  }

  const count = Math.min(strokes.length, targetPaths.length);
  let totalScore = 0;

  for (let index = 0; index < count; index += 1) {
    const result = recognizer.evaluate(strokes[index], targetPaths[index]);
    totalScore += Number.isFinite(result.score) ? result.score : 120;
  }

  const avgScore = totalScore / count;
  const targetStrokeCount = kanji.stroke_count ?? targetPaths.length;
  const strokeDelta = Math.abs(strokes.length - targetStrokeCount);
  const mismatchPenalty = strokeDelta * 30;
  return avgScore + mismatchPenalty;
};

const toPercentScore = (score: number) => {
  if (!Number.isFinite(score)) {
    return 0;
  }

  const normalized = 100 - Math.round(score * 4);
  return Math.max(0, Math.min(100, normalized));
};

const CanvasSearch = ({ filters }: CanvasSearchProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Point[][]>(() => readSavedStrokes());
  const [isDrawing, setIsDrawing] = useState(false);
  const candidatesQuery = useKanjiSearchQuery({ filters }, strokes.length > 0);

  const candidates = useMemo<RecognitionCandidate[]>(() => {
    if (strokes.length === 0 || !candidatesQuery.data) {
      return [];
    }

    const recognizer = new StrokeRecognizer();
    const normalizedStrokes = normalizeStrokes(strokes);
    const ranked = candidatesQuery.data
      .filter((kanji) => Boolean(kanji.kvg?.stroke_paths?.length))
      .map((kanji) => {
        const score = scoreCandidate(recognizer, normalizedStrokes, kanji);
        return {
          kanji,
          score: toPercentScore(score),
        };
      })
      .sort((first, second) => second.score - first.score);

    return ranked.slice(0, 48);
  }, [candidatesQuery.data, strokes]);

  const isInitialLoading = candidatesQuery.isFetching && strokes.length > 0 && !candidatesQuery.data;

  const getPoint = useCallback((event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const bounds = canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1d1b20';
    context.lineWidth = 7;

    strokes.forEach((stroke) => {
      if (!stroke[0]) {
        return;
      }

      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    });
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(strokes));
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setStrokes((current) => [...current, [getPoint(event)]]);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.preventDefault();
    const point = getPoint(event);

    setStrokes((current) => {
      const next = [...current];
      const last = next[next.length - 1] ?? [];
      next[next.length - 1] = [...last, point];
      return next;
    });
  };

  const finishStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.preventDefault();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDrawing(false);
  };

  return (
    <div className="canvas-layout">
      <section className="draw-panel" aria-label="Холст для рукописного ввода">
        <div className="draw-toolbar compact-toolbar">
          <div className="toolbar-actions">
            <button className="icon-button" type="button" onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={strokes.length === 0} aria-label="Отменить последнюю черту">
              <CornerUpLeft size={19} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => setStrokes([])} disabled={strokes.length === 0} aria-label="Очистить холст">
              <Eraser size={19} />
            </button>
          </div>
        </div>

        <div className="canvas-frame">
          {strokes.length === 0 ? (
            <div className="canvas-placeholder">
              <Sparkles size={18} />
              Рисуйте мышью или пальцем
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            onPointerLeave={finishStroke}
          />
        </div>
      </section>

      <div>
        {isInitialLoading ? <LoadingState label="Распознаём рисунок" /> : null}
        {candidatesQuery.isError ? <div className="empty-state">{candidatesQuery.error.message}</div> : null}
        {!isInitialLoading && !candidatesQuery.isError ? (
          <KanjiList
            items={candidates}
            title="Похожие кандзи"
            emptyText={strokes.length === 0 ? 'После первой черты здесь появятся кандидаты.' : 'Нет кандидатов под текущие фильтры.'}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CanvasSearch;
