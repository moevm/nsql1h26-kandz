import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { CornerUpLeft, Eraser, Sparkles } from 'lucide-react';
import { useFilteredRecognitionQuery } from '../hooks/useKanjiQueries';
import type { GlobalFilters, Point } from '../types/kanji';
import KanjiList from './KanjiList';
import LoadingState from './LoadingState';
import './CanvasSearch.scss';

interface CanvasSearchProps {
  filters: GlobalFilters;
}

type NativePointerEvent = globalThis.PointerEvent & {
  getCoalescedEvents?: () => globalThis.PointerEvent[];
};

const STORAGE_KEY = 'kanji-lookup-canvas-strokes';
const MIN_POINT_DISTANCE = 0.7;
const BASE_BRUSH_WIDTH = 6.8;

const readSavedStrokes = (): Point[][] => {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y);

const brushWidth = (start: Point, end: Point) => {
  const speed = distance(start, end);
  return Math.max(4.6, Math.min(8.6, BASE_BRUSH_WIDTH + 1.4 - speed * 0.12));
};

const CanvasSearch = ({ filters }: CanvasSearchProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const rafRef = useRef<number | null>(null);
  const drawingRef = useRef(false);
  const [committedStrokes, setCommittedStrokes] = useState<Point[][]>(() => readSavedStrokes());
  const [isDrawing, setIsDrawing] = useState(false);
  const candidatesQuery = useFilteredRecognitionQuery(committedStrokes, filters);

  const getPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const bounds = canvas.getBoundingClientRect();
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  }, []);

  const getDrawingContext = useCallback((clear = false) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    const bounds = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      clear = true;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    if (clear) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#171615';
    context.lineWidth = BASE_BRUSH_WIDTH;
    context.shadowColor = 'rgba(17, 17, 17, 0.1)';
    context.shadowBlur = 0.7;

    return context;
  }, []);

  const redraw = useCallback(() => {
    const context = getDrawingContext(true);

    if (!context) {
      return;
    }

    strokesRef.current.forEach((stroke) => {
      if (!stroke[0]) {
        return;
      }

      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((point, index) => {
        const previous = stroke[index];
        context.lineWidth = brushWidth(previous, point);
        context.lineTo(point.x, point.y);
        context.stroke();
        context.beginPath();
        context.moveTo(point.x, point.y);
      });
    });
  }, [getDrawingContext]);

  const drawSegment = useCallback(
    (start: Point, end: Point) => {
      const context = getDrawingContext();

      if (!context) {
        return;
      }

      context.beginPath();
      context.lineWidth = brushWidth(start, end);
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    },
    [getDrawingContext],
  );

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  const commitStrokes = useCallback(
    (nextStrokes: Point[][]) => {
      strokesRef.current = nextStrokes;
      setCommittedStrokes(nextStrokes);
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  useEffect(() => {
    strokesRef.current = committedStrokes;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(committedStrokes));
    scheduleRedraw();
  }, [committedStrokes, scheduleRedraw]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const observer = new ResizeObserver(scheduleRedraw);
    observer.observe(canvas);

    return () => {
      observer.disconnect();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scheduleRedraw]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setIsDrawing(true);
    const point = getPoint(event.clientX, event.clientY);
    strokesRef.current = [...committedStrokes, [point]];
    redraw();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();
    const nativeEvent = event.nativeEvent as NativePointerEvent;
    const pointerEvents = nativeEvent.getCoalescedEvents?.() ?? [nativeEvent];
    const next = [...strokesRef.current];
    const currentStroke = [...(next[next.length - 1] ?? [])];

    pointerEvents.forEach((pointerEvent) => {
      const point = getPoint(pointerEvent.clientX, pointerEvent.clientY);
      const previous = currentStroke[currentStroke.length - 1];

      if (!previous || distance(previous, point) >= MIN_POINT_DISTANCE) {
        currentStroke.push(point);
        if (previous) {
          drawSegment(previous, point);
        }
      }
    });

    next[next.length - 1] = currentStroke;
    strokesRef.current = next;
    scheduleRedraw();
  };

  const finishStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    drawingRef.current = false;
    setIsDrawing(false);
    commitStrokes(strokesRef.current.filter((stroke) => stroke.length > 1));
  };

  const undoStroke = () => {
    commitStrokes(committedStrokes.slice(0, -1));
  };

  const clearCanvas = () => {
    commitStrokes([]);
  };

  const hasVisibleStrokes = committedStrokes.length > 0 || isDrawing;
  const candidates = candidatesQuery.data ?? [];
  const isInitialLoading = candidatesQuery.isFetching && committedStrokes.length > 0 && !candidatesQuery.data;

  return (
    <div className="canvas-layout">
      <section className="draw-panel" aria-label="Холст для рукописного ввода">
        <div className="draw-toolbar compact-toolbar">
          <div className="toolbar-actions">
            <button className="icon-button" type="button" onClick={undoStroke} disabled={committedStrokes.length === 0} aria-label="Отменить последнюю черту">
              <CornerUpLeft size={19} />
            </button>
            <button className="icon-button danger" type="button" onClick={clearCanvas} disabled={committedStrokes.length === 0} aria-label="Очистить холст">
              <Eraser size={19} />
            </button>
          </div>
        </div>

        <div className="canvas-frame">
          {!hasVisibleStrokes ? (
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
            emptyText={committedStrokes.length === 0 ? 'После первой черты здесь появятся кандидаты.' : 'Нет кандидатов под текущие фильтры.'}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CanvasSearch;
