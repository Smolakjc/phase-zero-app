"use client";

import React from "react";
import { GridPixel } from "@phase-zero/shared";

export interface PixelInfoBarProps {
  pixel: GridPixel;
}

/**
 * Barra inferior de inspeção do pixel clicado na malha 3D (`K-F2`).
 */
export function PixelInfoBar({ pixel }: PixelInfoBarProps) {
  return (
    <div
      data-testid="pixel-info-bar"
      className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-sky-500/30"
    >
      <div className="md:col-span-2">
        <span className="text-slate-500 block">Setor Clicado ({pixel.id} · 80m×80m):</span>
        <span data-testid="pixel-zone" className="text-sky-300 font-bold text-sm">
          {pixel.zone}
        </span>
      </div>
      <div>
        <span className="text-slate-500 block">Coerência Radar (γ):</span>
        <span className={pixel.masked ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
          {pixel.coherence} {pixel.masked ? "(Mascarado)" : "(Confiável)"}
        </span>
      </div>
      <div>
        <span className="text-slate-500 block">Altitude Real do Bloco:</span>
        <span className="text-slate-200">{pixel.elevation_m} m</span>
      </div>
      <div>
        <span className="text-slate-500 block">Coordenadas (Lat, Lon):</span>
        <span className="text-slate-300">
          {pixel.lat.toFixed(4)}°, {pixel.lon.toFixed(4)}°
        </span>
      </div>
      <div>
        <span className="text-slate-500 block">Anomalia Residual:</span>
        <span className="text-rose-400 font-extrabold text-sm">{pixel.residual_mm} mm</span>
      </div>
    </div>
  );
}

