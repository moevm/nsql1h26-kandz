import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { KANJI_ENTRIES } from '../constants';

interface CanvasModeProps {
  onSelectKanji: (symbol: string) => void;
}

type Point = {
  x: number;
  y: number;
};

const CanvasMode = ({ onSelectKanji }: CanvasModeProps) => {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>): Point => {
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

  const redrawCanvas = useCallback(() => {
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
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#111';
    context.lineWidth = 5;

    strokes.forEach((stroke) => {
      if (stroke.length === 0) {
        return;
      }

      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);

      for (let index = 1; index < stroke.length; index += 1) {
        context.lineTo(stroke[index].x, stroke[index].y);
      }

      context.stroke();
    });
  }, [strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(() => {
      redrawCanvas();
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redrawCanvas]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);

    setIsDrawing(true);
    setStrokes((previous) => [...previous, [point]]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.preventDefault();
    const point = getPoint(event);

    setStrokes((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const next = [...previous];
      const lastStroke = next[next.length - 1];
      next[next.length - 1] = [...lastStroke, point];
      return next;
    });
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setStrokes((previous) => previous.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
    setIsDrawing(false);
  };

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="relative flex-1 rounded border border-gray-300 bg-white shadow-inner">
        {strokes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.2em] text-gray-300 uppercase">
            Рисуем мышкой
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
        />
        <div className="absolute right-2 bottom-2 flex gap-2">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-[10px] font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={12} /> UNDO
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-[10px] font-bold text-red-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={12} /> CLEAR
          </button>
        </div>
      </div>

      <div className="h-2/5 divide-y divide-gray-100 overflow-y-auto rounded border border-gray-300 bg-white">
        {KANJI_ENTRIES.map((entry) => (
          <button
            key={entry.symbol}
            onClick={() => onSelectKanji(entry.symbol)}
            className="flex w-full cursor-pointer items-center p-3 text-left transition-colors hover:bg-blue-50"
          >
            <span className="mr-4 w-14 text-center text-4xl">{entry.symbol}</span>
            <div>
              <div className="text-[10px] font-bold tracking-tighter text-blue-600 uppercase">
                Reading: {entry.reading}
              </div>
              <div className="text-sm font-semibold">{entry.meaning}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CanvasMode;