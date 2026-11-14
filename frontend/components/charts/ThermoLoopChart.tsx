"use client";

import React, { useState } from "react";
import { GridPixel } from "@phase-zero/shared";
import { computeSymmetricTicks, HorizontalGridLines } from "./Axis";
import { ChartFrame } from "./ChartFrame";
import { Polyline } from "./Polyline";

export interface ThermoLoopChartProps {
  pixel: GridPixel;
  residualTrendMmPerPass: number;
  className?: string;
}

const VIEW_W = 500;
const VIEW_H = 240;
const X_LEFT = 55;
const X_RIGHT = 468;
const Y_TOP = 24;
const Y_BOTTOM = 204;

/**
 * Gráfico SVG do Loop Termo-Mecânico (TS °C × Deslocamento LOS mm) auto-escalado (`K-F4`).
 */
export function ThermoLoopChart({
  pixel,
  residualTrendMmPerPass,
  className = "",
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
      className={className}
      title={`Loop Termo-Mecânico (${pixel.id})`}
      subtitle="Temperatura superficial TS (°C) vs. deslocamento corrigido (mm)."
      rightSlot={
        <span className="text-[11px] font-mono tabular-nums text-[var(--pz-accent)] bg-[var(--pz-well)] px-2.5 py-1 rounded-lg border border-[var(--pz-border)]">
          Taxa: {residualTrendMmPerPass} mm/c
        </span>
      }
    >
      <div className="space-y-2">
        <svg
          data-testid="thermo-loop-chart"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block w-full h-auto max-h-[225px] bg-[var(--pz-well)] rounded-xl border border-[var(--pz-border)]"
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
            stroke="var(--pz-border)"
            strokeWidth="1"
          />
          <text x={305} y={226} fill="var(--pz-muted)" fontSize="10" fontFamily="monospace">
            TS ({minTemp.toFixed(0)}°C–{maxTemp.toFixed(0)}°C)
          </text>
          <text x={14} y={16} fill="var(--pz-muted)" fontSize="10" fontFamily="monospace">
            Desloc. LOS (mm)
          </text>

          <Polyline points={points} stroke="var(--pz-accent)" strokeWidth={2.2} />

          {loop.map((pt, idx) => {
            const p = points[idx];
            const isFirst = idx === 0;
            const isLast = idx === loop.length - 1;
            return (
              <circle
                key={`${pt.date}-${idx}`}
                cx={p.x}
                cy={p.y}
                r={isLast ? 6 : isFirst ? 4.5 : 3.2}
                fill={isLast ? "#f43f5e" : isFirst ? "var(--pz-surface)" : "var(--pz-accent)"}
                stroke={
                  hoverIdx === idx
                    ? "var(--pz-text)"
                    : isFirst
                      ? "var(--pz-text)"
                      : isLast
                        ? "var(--pz-surface)"
                        : "none"
                }
                strokeWidth={isFirst || hoverIdx === idx ? 1.8 : 1.2}
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
            className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums bg-[var(--pz-well)] px-3 py-1.5 rounded-lg border border-[var(--pz-border)] text-[var(--pz-secondary)]"
          >
            <span className="text-[var(--pz-accent)] font-semibold">{loop[hoverIdx].date}</span>
            <span>TS: {loop[hoverIdx].surface_temp_c} °C</span>
            <span>Desloc.: {loop[hoverIdx].displacement_mm} mm</span>
            <span className="text-[var(--pz-danger-ink)] font-semibold">
              Residual: {loop[hoverIdx].residual_mm} mm
            </span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
