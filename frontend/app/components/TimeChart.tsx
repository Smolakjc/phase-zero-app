"use client";
import React, { useRef, useState } from "react";

type Props = {
  dates: string[];
  raw: number[];
  expected: number[];
  residual: number[];
  color: string;
};

const W = 820, H = 300, L = 48, R = 16, T = 16, B = 32;

export default function TimeChart({ dates, raw, expected, residual, color }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const n = dates.length;

  const all = [...raw, ...expected, ...residual];
  const maxAbs = Math.max(5, ...all.map((v) => Math.abs(v)));
  const step = maxAbs > 40 ? 20 : maxAbs > 15 ? 10 : 5;
  const ext = Math.ceil(maxAbs / step) * step;

  const x = (i: number) => L + (i / Math.max(1, n - 1)) * (W - L - R);
  const y = (v: number) => T + ((ext - v) / (2 * ext)) * (H - T - B);
  const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const ticks: number[] = [];
  for (let v = -ext; v <= ext; v += step) ticks.push(v);

  const move = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const labelEvery = Math.ceil(n / 7);

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#b9b2a1" : "#e2dccf"} strokeWidth="1" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6f6b61">
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6f6b61">
              {d.slice(5).split("-").reverse().join("/")}
            </text>
          ) : null
        )}

        <path d={path(raw)} pathLength={1} fill="none" stroke="#b9b2a1" strokeWidth="1.8" strokeLinejoin="round" className="draw" />
        <path d={path(expected)} fill="none" stroke="#1b1a17" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" className="fade" />
        <path d={path(residual)} pathLength={1} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="draw" style={{ animationDelay: "0.2s" }} />

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#1b1a17" strokeOpacity="0.25" />
            <circle cx={x(hover)} cy={y(residual[hover])} r="5" fill={color} stroke="#fbf9f4" strokeWidth="2" />
          </g>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Legend swatch={<span className="h-0.5 w-5 bg-[#b9b2a1]" />} label="Medido" />
          <Legend swatch={<span className="w-5 border-t-2 border-dotted border-ink" />} label="Esperado pelo clima" />
          <Legend swatch={<span className="h-1 w-5 rounded" style={{ background: color }} />} label="Anomalia (o que sobra)" />
        </div>
        <div className="h-5 tabular-nums text-ink">
          {hover !== null && (
            <>
              {dates[hover]} · medido {raw[hover].toFixed(1)} · anomalia{" "}
              <b>{residual[hover].toFixed(1)} mm</b>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      {label}
    </span>
  );
}

