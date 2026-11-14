"use client";

import React from "react";
import { GridPixel, PIXEL_RESIDUAL_THRESHOLDS_MM } from "@phase-zero/shared";
import { getZoneVisualStyle } from "../../lib/colors";

export interface PixelInfoBarProps {
  pixel: GridPixel;
}

/**
 * Barra inferior de inspeção do pixel clicado na malha 3D (`K-F2`).
 */
export function PixelInfoBar({ pixel }: PixelInfoBarProps) {
  const absRes = Math.abs(pixel.residual_mm);
  const residualClass =
    absRes < PIXEL_RESIDUAL_THRESHOLDS_MM.GREEN_MAX_ABS_MM
      ? "text-[var(--pz-ok-ink)]"
      : absRes >= PIXEL_RESIDUAL_THRESHOLDS_MM.RED_MIN_ABS_MM
        ? "text-[var(--pz-danger-ink)]"
        : "text-[var(--pz-warn-ink)]";

  const zoneStyle = getZoneVisualStyle(pixel.zone);

  return (
    <div
      data-testid="pixel-info-bar"
      className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs bg-[var(--pz-well)] px-3.5 py-3 rounded-xl border border-[var(--pz-border)]"
    >
      <div className="col-span-2 sm:col-span-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--pz-muted)]">Setor (80m × 80m)</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] font-medium rounded border ${zoneStyle.badgeClass}`}
          >
            {zoneStyle.shortLabel}
          </span>
        </div>
        <span
          data-testid="pixel-zone"
          className="text-[var(--pz-text)] font-semibold truncate block mt-0.5"
          title={`${pixel.zone} — ${zoneStyle.radarNote}`}
        >
          {pixel.zone}
        </span>
      </div>

      <div>
        <span className="text-[11px] text-[var(--pz-muted)] block">Coerência (γ)</span>
        <span
          className={`font-mono tabular-nums font-semibold mt-0.5 block ${
            pixel.masked ? "text-[var(--pz-danger-ink)]" : "text-[var(--pz-ok-ink)]"
          }`}
          title={zoneStyle.radarNote}
        >
          {pixel.coherence.toFixed(2)}{" "}
          <span className="font-sans font-normal text-[11px]">
            {pixel.masked ? "(Mascarado)" : "(Válido)"}
          </span>
        </span>
      </div>

      <div>
        <span className="text-[11px] text-[var(--pz-muted)] block">Anomalia Residual</span>
        <span className={`font-mono tabular-nums font-bold mt-0.5 block ${residualClass}`}>
          {pixel.residual_mm} mm
        </span>
      </div>

      <div>
        <span className="text-[11px] text-[var(--pz-muted)] block">Pixel na Malha</span>
        <span className="font-mono tabular-nums text-[var(--pz-secondary)] mt-0.5 block">
          {pixel.id}
        </span>
      </div>

      <div>
        <span className="text-[11px] text-[var(--pz-muted)] block">Elevação DEM</span>
        <span className="font-mono tabular-nums text-[var(--pz-text)] mt-0.5 block">
          {pixel.elevation_m} m
        </span>
      </div>

      <div>
        <span className="text-[11px] text-[var(--pz-muted)] block">Coordenadas</span>
        <span className="font-mono tabular-nums text-[var(--pz-secondary)] mt-0.5 block">
          {pixel.lat.toFixed(4)}°, {pixel.lon.toFixed(4)}°
        </span>
      </div>
    </div>
  );
}
