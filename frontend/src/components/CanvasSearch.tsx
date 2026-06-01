import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PointerEvent } from 'react';
import { CornerUpLeft, Eraser, Sparkles } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import { useFilteredRecognitionQuery } from '../hooks/useKanjiQueries';
import type { GlobalFilters, Point } from '../types/kanji';
import KanjiList from './KanjiList';
import LoadingState from './LoadingState';
import './CanvasSearch.scss';

interface CanvasSearchProps {
  filters: GlobalFilters;
  strokes: Point[][];
  onStrokesChange: Dispatch<SetStateAction<Point[][]>>;
}

type NativePointerEvent = globalThis.PointerEvent & {
  getCoalescedEvents?: () => globalThis.PointerEvent[];
};

const MIN_POINT_DISTANCE = 0.45;
const FREEHAND_OPTIONS = {
  size: 7.2,
  thinning: 0.24,
  smoothing: 0.72,
  streamline: 0.62,
  simulatePressure: true,
  start: { cap: true },
  end: { cap: true },
};

const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y);

const collectPointerEvents = (event: NativePointerEvent) => {
  const coalescedEvents = event.getCoalescedEvents?.() ?? [];

  if (coalescedEvents.length === 0) {
    return [event];
  }

  const last = coalescedEvents[coalescedEvents.length - 1];
  const includesCurrentEvent = last.clientX === event.clientX && last.clientY === event.clientY;

  return includesCurrentEvent ? coalescedEvents : [...coalescedEvents, event];
};

const drawFreehandStroke = (context: CanvasRenderingContext2D, stroke: Point[]) => {
  if (!stroke[0]) {
    return;
  }

  if (stroke.length === 1) {
    context.beginPath();
    context.arc(stroke[0].x, stroke[0].y, FREEHAND_OPTIONS.size / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const outline = getStroke(
    stroke.map((point) => [point.x, point.y]),
    FREEHAND_OPTIONS,
  );

  if (outline.length < 2) {
    return;
  }

  context.beginPath();
  context.moveTo(outline[0][0], outline[0][1]);

  for (let index = 1; index < outline.length - 1; index += 1) {
    const current = outline[index];
    const next = outline[index + 1];
    context.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    );
  }

  context.closePath();
  context.fill();
};

const CanvasSearch = ({ filters, strokes, onStrokesChange }: CanvasSearchProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const rafRef = useRef<number | null>(null);
  const drawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const candidatesQuery = useFilteredRecognitionQuery(strokes, filters);

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
    context.fillStyle = '#171615';

    return context;
  }, []);

  const redraw = useCallback(() => {
    const context = getDrawingContext(true);

    if (!context) {
      return;
    }

    strokesRef.current.forEach((stroke) => {
      drawFreehandStroke(context, stroke);
    });
  }, [getDrawingContext]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  const attachCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;

      if (canvas) {
        scheduleRedraw();
      }
    },
    [scheduleRedraw],
  );

  useLayoutEffect(() => {
    strokesRef.current = strokes;
    redraw();
    scheduleRedraw();
  }, [redraw, scheduleRedraw, strokes]);

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
    strokesRef.current = [...strokes, [point]];
    redraw();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    event.preventDefault();
    const nativeEvent = event.nativeEvent as NativePointerEvent;
    const pointerEvents = collectPointerEvents(nativeEvent);
    const next = [...strokesRef.current];
    const currentStroke = [...(next[next.length - 1] ?? [])];

    pointerEvents.forEach((pointerEvent) => {
      const point = getPoint(pointerEvent.clientX, pointerEvent.clientY);
      const previous = currentStroke[currentStroke.length - 1];

      if (!previous || distance(previous, point) >= MIN_POINT_DISTANCE) {
        currentStroke.push(point);
      }
    });

    next[next.length - 1] = currentStroke;
    strokesRef.current = next;
    redraw();
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
    onStrokesChange(strokesRef.current.filter((stroke) => stroke.length > 1));
  };

  const undoStroke = () => {
    strokesRef.current = strokes.slice(0, -1);
    onStrokesChange(strokesRef.current);
    redraw();
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    onStrokesChange([]);
    redraw();
  };

  const hasCommittedStrokes = strokes.length > 0;
  const hasVisibleStrokes = hasCommittedStrokes || isDrawing;
  const candidates = hasCommittedStrokes ? candidatesQuery.data ?? [] : [];
  const isInitialLoading = candidatesQuery.isFetching && hasCommittedStrokes && !candidatesQuery.data;
  const isRecognitionError = hasCommittedStrokes && candidatesQuery.isError;

  return (
    <div className="canvas-layout">
      <section className="draw-panel" aria-label="Холст для рукописного ввода">
        <div className="draw-toolbar compact-toolbar">
          <div className="toolbar-actions">
            <button className="icon-button" type="button" onClick={undoStroke} disabled={strokes.length === 0} aria-label="Отменить последнюю черту">
              <CornerUpLeft size={19} />
            </button>
            <button className="icon-button danger" type="button" onClick={clearCanvas} disabled={strokes.length === 0} aria-label="Очистить холст">
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
            ref={attachCanvas}
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
        {isRecognitionError ? <div className="empty-state">{candidatesQuery.error.message}</div> : null}
        {!isInitialLoading && !isRecognitionError ? (
          <KanjiList
            items={candidates}
            title="Похожие кандзи"
            emptyText={strokes.length === 0 ? 'После первой черты здесь появятся кандидаты' : 'Нет кандидатов под текущие фильтры.'}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CanvasSearch;
