"use client";

import React, { useState } from "react";
import { GridPixel } from "@phase-zero/shared";
import { computeSymmetricTicks, HorizontalGridLines } from "./Axis";
import { ChartFrame } from "./ChartFrame";
import { Polyline } from "./Polyline";

export interface ThermoLoopChartProps {
  pixel: GridPixel;
  residualTrendMmPerPass: number;
}

const VIEW_W = 500;
const VIEW_H = 240;
const X_LEFT = 55;
const X_RIGHT = 465;
const Y_TOP = 24;
const Y_BOTTOM = 205;

/**
 * Gráfico SVG do Loop Termo-Mecânico (TS °C × Deslocamento LOS mm) auto-escalado (`K-F4`).
 */
export function ThermoLoopChart({
  pixel,
  residualTrendMmPerPass,
}: ThermoLoopChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const loop = pixel.pixel_time_series.thermo_loop;

  const temps = loop.map((p) => p.surface_temp_c);
  const disps = loop.map((p) => p.displacement_mm);

  const minTemp = temps.length > 0 ? Math.min(10, ...temps) - 2 : 10;
  const maxTemp = temps.length > 0 ? Math.max(38, ...temps) + 2 : 38;
  const tempSpan = Math.max(1, maxTemp - minTemp);

  const { extent, ticks } = computeSymmetricTicks(disps, 20);

  const mapX = (tempC: number): number =>
    X_LEFT + ((tempC - minTemp) / tempSpan) * (X_RIGHT - X_LEFT);
  const mapY = (dispMm: number): number => {
    const midY = (Y_TOP + Y_BOTTOM) / 2.0;
    const halfH = (Y_BOTTOM - Y_TOP) / 2.0;
    return midY - (dispMm / extent) * halfH;
  };

  const points = loop.map((pt) => ({
    x: mapX(pt.surface_temp_c),
    y: mapY(pt.displacement_mm),
  }));

  return (
    <ChartFrame
      className="lg:col-span-5"
      title={`4. Thermo-Mechanical Response Loop [${pixel.id}]`}
      subtitle="Temperatura Superficial TS (°C) vs. Deslocamento Corrigido (mm)."
      rightSlot={
        <span className="text-xs font-mono text-sky-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          Taxa: {residualTrendMmPerPass} mm/ciclo
        </span>
      }
    >
      <div className="relative">
        <svg
          data-testid="thermo-loop-chart"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-[230px] bg-[#02050b] rounded-xl border border-slate-800"
        >
          <HorizontalGridLines
            ticks={ticks}
            mapY={mapY}
            xStart={X_LEFT - 10}
            xEnd={X_RIGHT + 10}
            unit="mm"
          />
          <line
            x1={(X_LEFT + X_RIGHT) / 2}
            y1={Y_TOP}
            x2={(X_LEFT + X_RIGHT) / 2}
            y2={Y_BOTTOM}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text x={320} y={228} fill="#64748b" fontSize="10" fontFamily="monospace">
            Temp. Superficial TS ({minTemp.toFixed(0)}°C–{maxTemp.toFixed(0)}°C) →
          </text>
          <text x={12} y={16} fill="#64748b" fontSize="10" fontFamily="monospace">
            ↑ Deslocamento LOS (mm)
          </text>

          <Polyline points={points} stroke="#38bdf8" strokeWidth={2.4} />

          {loop.map((pt, idx) => {
            const p = points[idx];
            const isLast = idx === loop.length - 1;
            return (
              <circle
                key={`${pt.date}-${idx}`}
                cx={p.x}
                cy={p.y}
                r={isLast ? 6.5 : 3.5}
                fill={isLast ? "#f43f5e" : "#38bdf8"}
                stroke={hoverIdx === idx ? "#ffffff" : "none"}
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>

        {hoverIdx !== null && loop[hoverIdx] && (
          <div
            data-testid="thermo-tooltip"
            className="mt-2 flex flex-wrap gap-3 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300"
          >
            <span className="text-sky-400 font-bold">📅 {loop[hoverIdx].date}</span>
            <span>TS: {loop[hoverIdx].surface_temp_c} °C</span>
            <span>Deslocamento: {loop[hoverIdx].displacement_mm} mm</span>
            <span className="text-rose-400 font-bold">
              Residual: {loop[hoverIdx].residual_mm} mm
            </span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

