"use client";

import React, { useState } from "react";
import { GridPixel, StatusCode } from "@phase-zero/shared";
import { getStatusStrokeColor } from "../../lib/colors";
import { computeSymmetricTicks, HorizontalGridLines } from "./Axis";
import { ChartFrame } from "./ChartFrame";
import { Polyline } from "./Polyline";

export interface TimeSeriesChartProps {
  dates: readonly string[];
  pixel: GridPixel;
  statusCode: StatusCode;
}

const VIEW_W = 760;
const VIEW_H = 240;
const X_START = 55;
const X_END = 725;
const Y_TOP = 20;
const Y_BOTTOM = 205;

/**
 * Gráfico SVG de Deconvolução Temporal com eixo Y auto-escalado e tooltip (`K-F3`).
 */
export function TimeSeriesChart({ dates, pixel, statusCode }: TimeSeriesChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const ts = pixel.pixel_time_series;

  const allValues = [
    ...ts.observed_raw_mm,
    ...ts.expected_environmental_mm,
    ...ts.residual_anomaly_mm,
  ];
  const { extent, ticks } = computeSymmetricTicks(allValues, 20);

  const mapX = (i: number): number =>
    X_START + (i / Math.max(1, dates.length - 1)) * (X_END - X_START);
  const mapY = (v: number): number => {
    const midY = (Y_TOP + Y_BOTTOM) / 2.0;
    const halfH = (Y_BOTTOM - Y_TOP) / 2.0;
    return midY - (v / extent) * halfH;
  };

  const rawPts = ts.observed_raw_mm.map((v, i) => ({ x: mapX(i), y: mapY(v) }));
  const expPts = ts.expected_environmental_mm.map((v, i) => ({ x: mapX(i), y: mapY(v) }));
  const resPts = ts.residual_anomaly_mm.map((v, i) => ({ x: mapX(i), y: mapY(v) }));
  const residualColor = getStatusStrokeColor(statusCode);
  const labelStride = Math.max(1, Math.ceil(dates.length / 6));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dates.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const rawIdx = Math.round(((svgX - X_START) / (X_END - X_START)) * (dates.length - 1));
    const idx = Math.max(0, Math.min(dates.length - 1, rawIdx));
    setHoverIdx(idx);
  };

  return (
    <ChartFrame
      className="lg:col-span-7"
      title={`3. Deconvolução Temporal (${dates[0] ?? ""} até ${dates[dates.length - 1] ?? ""}) — [${pixel.zone}]`}
      subtitle="Sinal Bruto (cinza), Movimento Ambiental Esperado NASA POWER (amarelo) e Anomalia Residual (verde/amarelo/vermelho)."
      rightSlot={
        <div className="flex gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400">── Bruto</span>
          <span className="text-amber-400">-- Clima (NASA POWER)</span>
          <span className="text-rose-400 font-bold">━━ Anomalia Residual</span>
        </div>
      }
    >
      <div className="relative">
        <svg
          data-testid="time-series-chart"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="w-full h-[230px] bg-[#02050b] rounded-xl border border-slate-800"
        >
          <HorizontalGridLines ticks={ticks} mapY={mapY} xStart={50} xEnd={735} unit="mm" />

          {dates.map((d, i) => {
            if (i % labelStride !== 0 && i !== dates.length - 1) return null;
            const x = mapX(i);
            return (
              <text
                key={`${d}-${i}`}
                x={x - 24}
                y={228}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {d}
              </text>
            );
          })}

          <Polyline points={rawPts} stroke="#64748b" strokeWidth={1.8} />
          <Polyline
            points={expPts}
            stroke="#fbbf24"
            strokeWidth={2.2}
            strokeDasharray="5,4"
          />
          <Polyline points={resPts} stroke={residualColor} strokeWidth={3.5} />

          {hoverIdx !== null && resPts[hoverIdx] && (
            <g>
              <line
                x1={resPts[hoverIdx].x}
                y1={Y_TOP}
                x2={resPts[hoverIdx].x}
                y2={Y_BOTTOM}
                stroke="#38bdf8"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              <circle
                cx={resPts[hoverIdx].x}
                cy={resPts[hoverIdx].y}
                r={5}
                fill={residualColor}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          )}
        </svg>

        {hoverIdx !== null && dates[hoverIdx] !== undefined && (
          <div
            data-testid="timeseries-tooltip"
            className="mt-2 flex flex-wrap gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300"
          >
            <span className="text-sky-400 font-bold">📅 {dates[hoverIdx]}</span>
            <span>Bruto: {ts.observed_raw_mm[hoverIdx]} mm</span>
            <span className="text-amber-300">
              Clima: {ts.expected_environmental_mm[hoverIdx]} mm
            </span>
            <span className="text-emerald-300 font-bold">
              Residual: {ts.residual_anomaly_mm[hoverIdx]} mm
            </span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

