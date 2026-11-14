"use client";

import React, { useMemo, useState } from "react";
import { computeMannKendall, GridPixel, StatusCode } from "@phase-zero/shared";
import { getStatusStrokeColor } from "../../lib/colors";
import { computeSymmetricTicks, HorizontalGridLines } from "./Axis";
import { ChartFrame } from "./ChartFrame";
import { Polyline } from "./Polyline";

export interface TimeSeriesChartProps {
  dates: readonly string[];
  pixel: GridPixel;
  statusCode: StatusCode;
  className?: string;
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
export function TimeSeriesChart({
  dates,
  pixel,
  statusCode,
  className = "",
}: TimeSeriesChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(true);
  const [showClimate, setShowClimate] = useState<boolean>(true);
  const [showResidual, setShowResidual] = useState<boolean>(true);

  const ts = pixel.pixel_time_series;
  const mk = useMemo(
    () => computeMannKendall(ts.residual_anomaly_mm),
    [ts.residual_anomaly_mm],
  );

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
      className={className}
      title={`Deconvolução Temporal (${pixel.zone})`}
      subtitle={`Período ${dates[0] ?? "—"} até ${dates[dates.length - 1] ?? "—"} · Separação entre sinal bruto, clima NASA POWER e anomalia residual.`}
      rightSlot={
        <div
          role="group"
          aria-label="Camadas da série temporal"
          className="flex flex-wrap items-center gap-1.5 text-[11px] bg-[var(--pz-well)] px-2 py-1 rounded-xl border border-[var(--pz-border)]"
        >
          <button
            type="button"
            aria-pressed={showRaw}
            onClick={() => setShowRaw((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-opacity cursor-pointer ${
              showRaw ? "text-[var(--pz-secondary)]" : "text-[var(--pz-muted)] opacity-50"
            }`}
          >
            <span className="w-3 h-0.5 bg-[#64748b] inline-block" aria-hidden="true" />
            <span>Bruto</span>
          </button>

          <button
            type="button"
            aria-pressed={showClimate}
            onClick={() => setShowClimate((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-opacity cursor-pointer ${
              showClimate ? "text-[var(--pz-warn-ink)]" : "text-[var(--pz-muted)] opacity-50"
            }`}
          >
            <span
              className="w-3 h-0 border-t-2 border-dashed border-[#d97706] inline-block"
              aria-hidden="true"
            />
            <span>Clima</span>
          </button>

          <button
            type="button"
            aria-pressed={showResidual}
            onClick={() => setShowResidual((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold transition-opacity cursor-pointer ${
              showResidual ? "text-[var(--pz-text)]" : "text-[var(--pz-muted)] opacity-50"
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
          className="block w-full h-auto max-h-[225px] bg-[var(--pz-well)] rounded-xl border border-[var(--pz-border)]"
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
                fill="var(--pz-muted)"
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
              stroke="#d97706"
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
                stroke="var(--pz-accent)"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              {showResidual && (
                <circle
                  cx={resPts[hoverIdx].x}
                  cy={resPts[hoverIdx].y}
                  r={4.5}
                  fill={residualColor}
                  stroke="var(--pz-surface)"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )}
        </svg>

        {hoverIdx !== null && dates[hoverIdx] !== undefined && (
          <div
            data-testid="timeseries-tooltip"
            className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums bg-[var(--pz-well)] px-3 py-1.5 rounded-xl border border-[var(--pz-border)] text-[var(--pz-secondary)]"
          >
            <span className="text-[var(--pz-accent)] font-semibold">{dates[hoverIdx]}</span>
            <span>Bruto: {ts.observed_raw_mm[hoverIdx]} mm</span>
            <span className="text-[var(--pz-warn-ink)]">
              Clima: {ts.expected_environmental_mm[hoverIdx]} mm
            </span>
            <span className="text-[var(--pz-text)] font-semibold">
              Residual: {ts.residual_anomaly_mm[hoverIdx]} mm
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--pz-muted)]">Mann-Kendall:</span>
            <span className="text-[var(--pz-text)]">Sen&apos;s slope = {mk.sensSlope} mm/ciclo</span>
            <span className="text-[var(--pz-accent)] font-semibold">p = {mk.pValue}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-sans font-semibold border ${
              mk.isSignificant
                ? "pz-status-red"
                : "bg-[var(--pz-surface)] text-[var(--pz-muted)] border-[var(--pz-border)]"
            }`}
          >
            {mk.isSignificant
              ? `Tendência Significativa (${mk.confidenceLevel})`
              : "Estacionário (Ruído)"}
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}
