"use client";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  pixels: any[];
  selectedId?: string;
  onSelect: (px: any) => void;
};

const COLORS = {
  ok: [63, 125, 88],
  warn: [185, 121, 26],
  alert: [191, 59, 43],
  masked: [200, 194, 180],
  water: [150, 178, 190],
};

function pixelRGB(px: any): number[] {
  if (px.masked) return String(px.zone).includes("ÁGUA") ? COLORS.water : COLORS.masked;
  const v = Math.abs(px.residual_mm);
  if (v < 3.5) return COLORS.ok;
  if (v >= 18) return COLORS.alert;
  return COLORS.warn;
}

export default function Terrain({ pixels, selectedId, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hit = useRef<{ x: number; y: number; px: any }[]>([]);
  const view = useRef({ az: 0.6, pitch: 0.95, grow: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ w: 640, h: 440 });
  const [, tick] = useState(0);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: Math.max(340, Math.min(480, e.contentRect.width * 0.62)) })
    );
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // Relevo "cresce" a cada nova análise
  useEffect(() => {
    view.current.grow = 0;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      view.current.grow = 1 - Math.pow(1 - p, 3);
      draw();
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pixels]);

  useEffect(() => {
    draw();
  }, [size, selectedId]);

  function draw() {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || !pixels.length) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const rows = Math.max(...pixels.map((p) => p.row)) + 1;
    const cols = Math.max(...pixels.map((p) => p.col)) + 1;
    const elev = pixels.map((p) => p.elevation_m);
    const lo = Math.min(...elev);
    const hi = Math.max(...elev);
    const mid = (lo + hi) / 2;
    const span = Math.max(hi - lo, 12);

    const { az, pitch, grow } = view.current;
    const unit = Math.min(size.w / (cols * 1.15), (size.h * 1.5) / rows);
    const zScale = unit * 4.2 * grow;
    const cx = size.w / 2;
    const cy = size.h / 2 + 10;

    const proj = (r: number, c: number, e: number) => {
      const x0 = (c - (cols - 1) / 2) * unit;
      const y0 = (r - (rows - 1) / 2) * unit;
      const z = ((e - mid) / span) * zScale;
      const xr = x0 * Math.cos(az) - y0 * Math.sin(az);
      const yr = x0 * Math.sin(az) + y0 * Math.cos(az);
      return {
        x: cx + xr,
        y: cy + yr * Math.cos(pitch) - z * Math.sin(pitch),
        d: yr * Math.sin(pitch) + z * Math.cos(pitch),
      };
    };

    const map = new Map<string, any>();
    pixels.forEach((p) => map.set(`${p.row}_${p.col}`, { ...proj(p.row, p.col, p.elevation_m), p }));

    // Células (quadriláteros) ordenadas do fundo para a frente
    const cells: any[] = [];
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        const a = map.get(`${r}_${c}`), b = map.get(`${r}_${c + 1}`);
        const d = map.get(`${r + 1}_${c + 1}`), e = map.get(`${r + 1}_${c}`);
        if (!a || !b || !d || !e) continue;
        cells.push({ pts: [a, b, d, e], depth: (a.d + b.d + d.d + e.d) / 4 });
      }
    cells.sort((m, n) => m.depth - n.depth);

    cells.forEach(({ pts }) => {
      const rgb = [0, 1, 2].map((i) => Math.round(pts.reduce((s: number, q: any) => s + pixelRGB(q.p)[i], 0) / 4));
      const masked = pts.every((q: any) => q.p.masked);
      // sombreamento leve pela inclinação (altura média)
      const shade = 0.92 + 0.16 * ((pts[0].p.elevation_m - lo) / span);
      ctx.fillStyle = `rgba(${rgb.map((v) => Math.min(255, v * shade | 0)).join(",")},${masked ? 0.55 : 0.9})`;
      ctx.strokeStyle = "rgba(251,249,244,0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach((q: any, i: number) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Marcador do ponto selecionado
    const sel = selectedId ? Array.from(map.values()).find((m) => m.p.id === selectedId) : null;
    if (sel) {
      ctx.strokeStyle = "#1b1a17";
      ctx.fillStyle = "#fbf9f4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#1b1a17";
      ctx.fill();
    }

    hit.current = Array.from(map.values()).map((m) => ({ x: m.x, y: m.y, px: m.p }));
  }

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    view.current.az += dx * 0.008;
    view.current.pitch = Math.max(0.35, Math.min(1.35, view.current.pitch + dy * 0.006));
    d.x = e.clientX;
    d.y = e.clientY;
    draw();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !canvas.current) return;
    const r = canvas.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: any = null, bd = 24;
    for (const h of hit.current) {
      const dist = Math.hypot(h.x - x, h.y - y);
      if (dist < bd) { bd = dist; best = h.px; }
    }
    if (best) onSelect(best);
    tick((n) => n + 1);
  };

  return (
    <div ref={wrap} className="relative w-full select-none">
      <canvas
        ref={canvas}
        style={{ width: size.w, height: size.h, touchAction: "none" }}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />
      <p className="pointer-events-none absolute bottom-1 left-0 text-xs text-muted">
        Arraste para girar · clique em um bloco para ver os detalhes
      </p>
    </div>
  );
}

