/**
 * OVI Construction Tool — Interactive geometric constructions.
 * Supports: compass arcs, perpendicular bisectors, angle bisections.
 * Touch-friendly for mobile + desktop.
 */
import { useRef, useEffect, useState } from "react";

interface ConstructionStep {
  type: "point" | "line" | "arc" | "circle";
  points: { x: number; y: number }[];
  radius?: number;
  color?: string;
  dashed?: boolean;
  label?: string;
}

interface ConstructionToolProps {
  width?: number;
  height?: number;
  steps?: ConstructionStep[];
  title?: string;
  className?: string;
}

export default function ConstructionTool({
  width = 400,
  height = 400,
  steps = [],
  title,
  className = "",
}: ConstructionToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: width, h: height });

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.max(250, Math.floor(w * 0.85));
        setSize({ w, h });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = size;
    canvas.width = w;
    canvas.height = h;

    const scale = Math.min(w, h) / 20;
    const offsetX = w / 2;
    const offsetY = h / 2;

    const toCanvas = (x: number, y: number): [number, number] => [
      offsetX + x * scale,
      offsetY - y * scale,
    ];

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let x = -20; x <= 20; x++) {
      const [cx] = toCanvas(x, 0);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    }
    for (let y = -20; y <= 20; y++) {
      const [, cy] = toCanvas(0, y);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1;
    const [ax] = toCanvas(0, 0);
    const [, ay] = toCanvas(0, 0);
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(w, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, h); ctx.stroke();

    // Draw construction steps
    for (const step of steps) {
      const color = step.color || "#00d4ff";

      switch (step.type) {
        case "point": {
          for (const pt of step.points) {
            const [cx, cy] = toCanvas(pt.x, pt.y);
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke();
          }
          break;
        }
        case "line": {
          if (step.points.length >= 2) {
            const [x1, y1] = toCanvas(step.points[0].x, step.points[0].y);
            const [x2, y2] = toCanvas(step.points[1].x, step.points[1].y);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = color; ctx.lineWidth = 1.5;
            if (step.dashed) ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          break;
        }
        case "arc":
        case "circle": {
          if (step.points.length >= 1 && step.radius) {
            const [cx, cy] = toCanvas(step.points[0].x, step.points[0].y);
            const r = step.radius * scale;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = color; ctx.lineWidth = 1;
            if (step.dashed) ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          break;
        }
      }

      if (step.label && step.points.length > 0) {
        const [lx, ly] = toCanvas(step.points[0].x, step.points[0].y);
        ctx.fillStyle = step.color || "#00d4ff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(step.label, lx + 8, ly - 8);
      }
    }
  }, [size, steps]);

  return (
    <div ref={containerRef} className={`w-full max-w-lg ${className}`}>
      {title && <p className="text-sm font-semibold text-foreground mb-2">{title}</p>}
      <div className="border border-border rounded-lg overflow-hidden bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "auto", touchAction: "none" }}
        />
      </div>
    </div>
  );
}
