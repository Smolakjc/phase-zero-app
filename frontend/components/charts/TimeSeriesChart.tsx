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
const X_START = 58;
const X_END = 720;
const Y_TOP = 20;
const Y_BOTTOM = 204;

/**
 * Gráfico SVG de Deconvolução Temporal com eixo Y auto-escalado, isolamento de camadas e tooltip (`K-F3`).
 */
export function TimeSeriesChart({ dates, pixel, statusCode }: TimeSeriesChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(true);
  const [showClimate, setShowClimate] = useState<boolean>(true);
  const [showResidual, setShowResidual] = useState<boolean>(true);

  const ts = pixel.pixel_time_series;

  const allValues = [
    ...(showRaw ? ts.observed_raw_mm : []),
    ...(showClimate ? ts.expected_environmental_mm : []),
    ...(showResidual ? ts.residual_anomaly_mm : []),
  ];
  const { extent, ticks } = computeSymmetricTicks(
    allValues.length > 0 ? allValues : ts.residual_anomaly_mm,
    20,
  );

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
      title={`Deconvolução Temporal (${pixel.zone})`}
      subtitle={`Período ${dates[0] ?? "—"} até ${dates[dates.length - 1] ?? "—"} · Separação entre sinal bruto, clima NASA POWER e anomalia residual.`}
      rightSlot={
        <div
          role="group"
          aria-label="Camadas da série temporal"
          className="flex flex-wrap items-center gap-1.5 text-[11px] bg-[#080b0f] px-2 py-1 rounded-md border border-[#222933]"
        >
          <button
            type="button"
            aria-pressed={showRaw}
            onClick={() => setShowRaw((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition-opacity cursor-pointer ${
              showRaw ? "text-[#cbd5e1]" : "text-[#687588] opacity-55"
            }`}
          >
            <span className="w-3 h-0.5 bg-[#64748b] inline-block" aria-hidden="true" />
            <span>Bruto</span>
          </button>

          <button
            type="button"
            aria-pressed={showClimate}
            onClick={() => setShowClimate((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition-opacity cursor-pointer ${
              showClimate ? "text-[#fde047]" : "text-[#687588] opacity-55"
            }`}
          >
            <span
              className="w-3 h-0 border-t-2 border-dashed border-[#eab308] inline-block"
              aria-hidden="true"
            />
            <span>Clima</span>
          </button>

          <button
            type="button"
            aria-pressed={showResidual}
            onClick={() => setShowResidual((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold transition-opacity cursor-pointer ${
              showResidual ? "text-[#eef2f6]" : "text-[#687588] opacity-55"
            }`}
          >
            <span
              className="w-3 h-[3px] rounded-full inline-block"
              style={{ backgroundColor: residualColor }}
              aria-hidden="true"
            />
            <span>Residual</span>
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <svg
          data-testid="time-series-chart"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="block w-full h-[220px] bg-[#080b0f] rounded-md border border-[#222933]"
        >
          <HorizontalGridLines ticks={ticks} mapY={mapY} xStart={52} xEnd={736} unit="mm" />

          {dates.map((d, i) => {
            if (i % labelStride !== 0 && i !== dates.length - 1) return null;
            const x = mapX(i);
            const anchor =
              i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle";
            return (
              <text
                key={`${d}-${i}`}
                x={x}
                y={226}
                textAnchor={anchor}
                fill="#8a96a8"
                fontSize="10"
                fontFamily="monospace"
              >
                {d}
              </text>
            );
          })}

          {showRaw && <Polyline points={rawPts} stroke="#64748b" strokeWidth={1.7} />}
          {showClimate && (
            <Polyline
              points={expPts}
              stroke="#eab308"
              strokeWidth={2}
              strokeDasharray="5,4"
            />
          )}
          {showResidual && <Polyline points={resPts} stroke={residualColor} strokeWidth={3} />}

          {hoverIdx !== null && resPts[hoverIdx] && (
            <g>
              <line
                x1={resPts[hoverIdx].x}
                y1={Y_TOP}
                x2={resPts[hoverIdx].x}
                y2={Y_BOTTOM}
                stroke="#3b9eeb"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              {showResidual && (
                <circle
                  cx={resPts[hoverIdx].x}
                  cy={resPts[hoverIdx].y}
                  r={4.5}
                  fill={residualColor}
                  stroke="#eef2f6"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )}
        </svg>

        {hoverIdx !== null && dates[hoverIdx] !== undefined && (
          <div
            data-testid="timeseries-tooltip"
            className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums bg-[#080b0f] px-3 py-1.5 rounded-md border border-[#222933] text-[#cbd5e1]"
          >
            <span className="text-[#3b9eeb] font-semibold">{dates[hoverIdx]}</span>
            <span>Bruto: {ts.observed_raw_mm[hoverIdx]} mm</span>
            <span className="text-[#fde047]">
              Clima: {ts.expected_environmental_mm[hoverIdx]} mm
            </span>
            <span className="text-[#eef2f6] font-semibold">
              Residual: {ts.residual_anomaly_mm[hoverIdx]} mm
            </span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
