/**
 * OVI Bearing Tool — Interactive compass bearing visualization.
 * Shows bearing angles (000°-360°) with compass rose.
 * Touch-friendly for mobile + desktop.
 */
import { useRef, useEffect, useState } from "react";

interface BearingLine {
  angle: number;
  distance?: number;
  label?: string;
  color?: string;
}

interface BearingToolProps {
  width?: number;
  height?: number;
  lines?: BearingLine[];
  showCompass?: boolean;
  title?: string;
  className?: string;
}

export default function BearingTool({
  width = 300,
  height = 300,
  lines = [],
  showCompass = true,
  title,
  className = "",
}: BearingToolProps) {
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
        setSize({ w, h: w });
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

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 30;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Compass circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Degree marks
    ctx.fillStyle = "#666688";
    ctx.font = `${Math.max(8, Math.floor(w / 35))}px monospace`;
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = (deg - 90) * Math.PI / 180;
      const inner = deg % 30 === 0 ? radius - 12 : radius - 6;
      const x1 = cx + Math.cos(rad) * inner;
      const y1 = cy + Math.sin(rad) * inner;
      const x2 = cx + Math.cos(rad) * radius;
      const y2 = cy + Math.sin(rad) * radius;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = deg % 30 === 0 ? "#4a4a6a" : "#2a2a4a";
      ctx.lineWidth = deg % 30 === 0 ? 1.5 : 0.5;
      ctx.stroke();

      if (deg % 30 === 0) {
        const lx = cx + Math.cos(rad) * (radius + 12);
        const ly = cy + Math.sin(rad) * (radius + 12);
        ctx.fillStyle = "#8888aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(deg).padStart(3, "0"), lx, ly);
      }
    }

    // Cardinal directions
    if (showCompass) {
      const fontSize = Math.max(11, Math.floor(w / 20));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#00d4ff";
      ctx.fillText("N", cx, cy - radius - 18);
      ctx.fillStyle = "#8888aa";
      ctx.fillText("S", cx, cy + radius + 22);
      ctx.fillText("E", cx + radius + 18, cy);
      ctx.fillText("W", cx - radius - 18, cy);
    }

    // Bearing lines
    for (const line of lines) {
      const rad = (line.angle - 90) * Math.PI / 180;
      const dist = line.distance ? (line.distance / 100) * radius : radius * 0.8;
      const x2 = cx + Math.cos(rad) * dist;
      const y2 = cy + Math.sin(rad) * dist;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = line.color || "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow head
      const headLen = 10;
      const headAngle = Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(rad - headAngle), y2 - headLen * Math.sin(rad - headAngle));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(rad + headAngle), y2 - headLen * Math.sin(rad + headAngle));
      ctx.strokeStyle = line.color || "#ff6b6b";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (line.label) {
        const lx = cx + Math.cos(rad) * (dist * 0.6);
        const ly = cy + Math.sin(rad) * (dist * 0.6);
        ctx.fillStyle = line.color || "#ff6b6b";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(line.label, lx + 10, ly - 10);
      }
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();
  }, [size, lines, showCompass]);

  return (
    <div ref={containerRef} className={`w-full max-w-sm ${className}`}>
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
