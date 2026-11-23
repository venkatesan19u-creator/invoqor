import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  isLightTheme?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  isLightTheme = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[] | null>(null);
  const isDrawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // Sync external clear/reset (e.g. Reset Document or Load from History)
  useEffect(() => {
    if (!value) {
      strokesRef.current = [];
      setHasInk(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      setHasInk(true);
    }
  }, [value]);

  const redrawDisplayCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = isLightTheme ? '#0F172A' : '#F8FAFC';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const allStrokes = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current;

    for (const stroke of allStrokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) {
        ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
      } else {
        for (let i = 1; i < stroke.length; i++) {
          const midX = (stroke[i - 1].x + stroke[i].x) / 2;
          const midY = (stroke[i - 1].y + stroke[i].y) / 2;
          ctx.quadraticCurveTo(stroke[i - 1].x, stroke[i - 1].y, midX, midY);
        }
        const last = stroke[stroke.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, [isLightTheme]);

  useEffect(() => {
    redrawDisplayCanvas();
  }, [redrawDisplayCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      redrawDisplayCanvas();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redrawDisplayCanvas]);

  // Export dark-ink (#0F172A) transparent PNG so signature renders crisply on white A4 PDF
  const exportDarkInkSignature = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scale = 2;
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(rect.width * scale);
    offscreen.height = Math.round(rect.height * scale);
    const octx = offscreen.getContext('2d');
    if (!octx) return null;

    octx.scale(scale, scale);
    octx.strokeStyle = '#0F172A';
    octx.lineWidth = 2.6;
    octx.lineCap = 'round';
    octx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      octx.beginPath();
      octx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) {
        octx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
      } else {
        for (let i = 1; i < stroke.length; i++) {
          const midX = (stroke[i - 1].x + stroke[i].x) / 2;
          const midY = (stroke[i - 1].y + stroke[i].y) / 2;
          octx.quadraticCurveTo(stroke[i - 1].x, stroke[i - 1].y, midX, midY);
        }
        const last = stroke[stroke.length - 1];
        octx.lineTo(last.x, last.y);
      }
      octx.stroke();
    }

    return offscreen.toDataURL('image/png');
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getPoint(e);
    activeStrokeRef.current = [pt];
    setHasInk(true);
    redrawDisplayCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const pt = getPoint(e);
    activeStrokeRef.current.push(pt);
    redrawDisplayCanvas();
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (activeStrokeRef.current && activeStrokeRef.current.length > 0) {
      strokesRef.current.push(activeStrokeRef.current);
      activeStrokeRef.current = null;
      redrawDisplayCanvas();
      const dataUrl = exportDarkInkSignature();
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    setHasInk(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="ui-subpanel relative rounded-xl overflow-hidden">
        {/* If loaded from storage without live vector strokes, show stored signature preview */}
        {value && strokesRef.current.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
            <img
              src={value}
              alt="Saved signature"
              className={`max-h-24 max-w-full object-contain opacity-90 ${
                isLightTheme ? '' : 'invert'
              }`}
            />
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="w-full h-36 block cursor-crosshair touch-none"
          aria-label="Digital signature drawing canvas"
        />

        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center ui-text-muted select-none">
            <span className="text-sm font-medium">Draw your signature here</span>
            <span className="text-xs opacity-80 mt-0.5">Supports mouse, trackpad, or finger</span>
          </div>
        )}

        {/* Subtle baseline guide */}
        <div
          className={`pointer-events-none absolute bottom-4 left-6 right-6 border-b border-dashed ${
            isLightTheme ? 'border-slate-900/20' : 'border-white/15'
          }`}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs ui-text-muted">
          {hasInk ? 'Signature applied to A4 preview' : 'Optional authorized signature'}
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasInk}
          className="ui-btn-soft inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
};
