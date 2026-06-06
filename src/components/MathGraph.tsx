/**
 * OVI Math Graph — Interactive coordinate grid for plotting.
 * Supports: points, lines, polygons, function plotting, transformations.
 * Touch-friendly for mobile + desktop.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

interface Point {
  x: number;
  y: number;
  label?: string;
}

interface MathGraphProps {
  width?: number;
  height?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  showGrid?: boolean;
  showAxes?: boolean;
  points?: Point[];
  lines?: { from: Point; to: Point; color?: string; label?: string }[];
  polygons?: { points: Point[]; color?: string; fill?: string; label?: string }[];
  functions?: { fn: (x: number) => number; color?: string; label?: string }[];
  title?: string;
  interactive?: boolean;
  onPointClick?: (point: Point) => void;
  className?: string;
}

export default function MathGraph({
  width = 400,
  height = 400,
  xRange = [-10, 10],
  yRange = [-10, 10],
  showGrid = true,
  showAxes = true,
  points = [],
  lines = [],
  polygons = [],
  functions: fnLines = [],
  title,
  interactive = false,
  onPointClick,
  className = "",
}: MathGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height });

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.max(250, Math.floor(w * 0.85));
        setCanvasSize({ w, h });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toCanvas = useCallback((x: number, y: number): [number, number] => {
    const cx = canvasSize.w / 2 + ((x - (xRange[0] + xRange[1]) / 2) / (xRange[1] - xRange[0])) * canvasSize.w * zoom;
    const cy = canvasSize.h / 2 - ((y - (yRange[0] + yRange[1]) / 2) / (yRange[1] - yRange[0])) * canvasSize.h * zoom;
    return [cx, cy];
  }, [canvasSize, xRange, yRange, zoom]);

  const fromCanvas = useCallback((cx: number, cy: number): Point => {
    const x = ((cx - canvasSize.w / 2) / (canvasSize.w * zoom)) * (xRange[1] - xRange[0]) + (xRange[0] + xRange[1]) / 2;
    const y = -((cy - canvasSize.h / 2) / (canvasSize.h * zoom)) * (yRange[1] - yRange[0]) + (yRange[0] + yRange[1]) / 2;
    return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
  }, [canvasSize, xRange, yRange, zoom]);

  // Get position from mouse or touch event
  const getEventPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvasSize;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 0.5;
      const xStep = Math.max(1, Math.floor((xRange[1] - xRange[0]) / 20));
      const yStep = Math.max(1, Math.floor((yRange[1] - yRange[0]) / 20));
      for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x += xStep) {
        const [cx] = toCanvas(x, 0);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      }
      for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y += yStep) {
        const [, cy] = toCanvas(0, y);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      }
    }

    // Axes
    if (showAxes) {
      ctx.strokeStyle = "#4a4a6a";
      ctx.lineWidth = 1.5;
      const [, ay] = toCanvas(0, 0);
      const [ax] = toCanvas(0, 0);
      ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(w, ay); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, h); ctx.stroke();

      ctx.fillStyle = "#8888aa";
      ctx.font = `${Math.max(9, Math.floor(w / 45))}px monospace`;
      const xStep = Math.max(1, Math.floor((xRange[1] - xRange[0]) / 10));
      const yStep = Math.max(1, Math.floor((yRange[1] - yRange[0]) / 10));
      for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x += xStep) {
        if (x === 0) continue;
        const [cx] = toCanvas(x, 0);
        ctx.fillText(String(x), cx - 4, ay + 14);
      }
      for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y += yStep) {
        if (y === 0) continue;
        const [, cy] = toCanvas(0, y);
        ctx.fillText(String(y), ax + 6, cy + 3);
      }
    }

    // Polygons
    for (const poly of polygons) {
      if (poly.points.length < 2) continue;
      ctx.beginPath();
      const [sx, sy] = toCanvas(poly.points[0].x, poly.points[0].y);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < poly.points.length; i++) {
        const [px, py] = toCanvas(poly.points[i].x, poly.points[i].y);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (poly.fill) { ctx.fillStyle = poly.fill; ctx.fill(); }
      ctx.strokeStyle = poly.color || "#00d4ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (poly.label) {
        const cx = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
        const cy = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
        const [lx, ly] = toCanvas(cx, cy);
        ctx.fillStyle = poly.color || "#00d4ff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(poly.label, lx + 5, ly - 5);
      }
    }

    // Lines
    for (const line of lines) {
      const [x1, y1] = toCanvas(line.from.x, line.from.y);
      const [x2, y2] = toCanvas(line.to.x, line.to.y);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = line.color || "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (line.label) {
        ctx.fillStyle = line.color || "#ff6b6b";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(line.label, (x1 + x2) / 2 + 5, (y1 + y2) / 2 - 5);
      }
    }

    // Functions
    for (const fn of fnLines) {
      ctx.beginPath();
      ctx.strokeStyle = fn.color || "#51cf66";
      ctx.lineWidth = 2;
      let started = false;
      const step = (xRange[1] - xRange[0]) / (canvasSize.w * 2);
      for (let x = xRange[0]; x <= xRange[1]; x += step) {
        const y = fn.fn(x);
        if (isNaN(y) || !isFinite(y)) continue;
        const [cx, cy] = toCanvas(x, y);
        if (cy < -50 || cy > canvasSize.h + 50) { started = false; continue; }
        if (!started) { ctx.moveTo(cx, cy); started = true; } else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Points
    for (const pt of points) {
      const [cx, cy] = toCanvas(pt.x, pt.y);
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00d4ff"; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
      if (pt.label) {
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif";
        ctx.fillText(pt.label, cx + 8, cy - 8);
      }
    }

    // Hovered point
    if (hoveredPoint) {
      const [cx, cy] = toCanvas(hoveredPoint.x, hoveredPoint.y);
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffcc00"; ctx.fill();
      ctx.fillStyle = "#ffcc00"; ctx.font = "10px monospace";
      ctx.fillText(`(${hoveredPoint.x}, ${hoveredPoint.y})`, cx + 10, cy - 10);
    }
  }, [canvasSize, xRange, yRange, showGrid, showAxes, points, lines, polygons, fnLines, zoom, hoveredPoint, toCanvas]);

  // Mouse + touch handlers
  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!interactive || !onPointClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx: number, cy: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      cx = (e.touches[0].clientX - rect.left) * scaleX;
      cy = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      cx = (e.clientX - rect.left) * scaleX;
      cy = (e.clientY - rect.top) * scaleY;
    }
    onPointClick(fromCanvas(cx, cy));
  }, [interactive, onPointClick, fromCanvas]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx: number, cy: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      cx = (e.touches[0].clientX - rect.left) * scaleX;
      cy = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      cx = (e.clientX - rect.left) * scaleX;
      cy = (e.clientY - rect.top) * scaleY;
    }
    setHoveredPoint(fromCanvas(cx, cy));
  }, [interactive, fromCanvas]);

  return (
    <div ref={containerRef} className={`w-full max-w-full ${className}`}>
      {title && <p className="text-sm font-semibold text-foreground mb-2">{title}</p>}
      <div className="relative border border-border rounded-lg overflow-hidden bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "auto", touchAction: "none" }}
          className={interactive ? "cursor-crosshair" : ""}
          onClick={handleClick}
          onTouchStart={handleClick}
          onMouseMove={handleMove}
          onTouchMove={handleMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onTouchEnd={() => setHoveredPoint(null)}
        />
        {interactive && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}>
              <ZoomIn size={14} />
            </Button>
            <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.5))}>
              <ZoomOut size={14} />
            </Button>
            <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(1)}>
              <RotateCcw size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
