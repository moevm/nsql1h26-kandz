import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { CornerUpLeft, Eraser, Sparkles } from 'lucide-react';
import { useFilteredRecognitionQuery } from '../hooks/useKanjiQueries';
import type { GlobalFilters, Point } from '../types/kanji';
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

const CanvasSearch = ({ filters }: CanvasSearchProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Point[][]>(() => readSavedStrokes());
  const [isDrawing, setIsDrawing] = useState(false);
  const recognitionQuery = useFilteredRecognitionQuery(strokes, filters);

  const candidates = useMemo(
    () => (strokes.length === 0 ? [] : (recognitionQuery.data ?? [])),
    [recognitionQuery.data, strokes.length],
  );
  const isInitialLoading = recognitionQuery.isFetching && strokes.length > 0 && !recognitionQuery.data;

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
        {recognitionQuery.isError ? <div className="empty-state">{recognitionQuery.error.message}</div> : null}
        {!isInitialLoading && !recognitionQuery.isError ? (
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
