"use client";

import React, { useState } from "react";
import { GridPixel, ScenarioMeta } from "@phase-zero/shared";
import { PixelInfoBar } from "./PixelInfoBar";
import { TerrainCanvas } from "./TerrainCanvas";

export interface TerrainViewport3DProps {
  meta: ScenarioMeta;
  pixels: readonly GridPixel[];
  selectedPixel: GridPixel;
  onSelectPixel: (px: GridPixel) => void;
}

const DEFAULT_AZIMUTH = 34;
const DEFAULT_PITCH = 54;

/**
 * Painel completo do Viewport Topográfico 3D (`K-F1` + `K-F2`).
 */
export function TerrainViewport3D({
  meta,
  pixels,
  selectedPixel,
  onSelectPixel,
}: TerrainViewport3DProps) {
  const [rotAzimuth, setRotAzimuth] = useState<number>(DEFAULT_AZIMUTH);
  const [rotPitch, setRotPitch] = useState<number>(DEFAULT_PITCH);

  return (
    <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400">
            1. Viewport Topográfico 3D Interativo (Malha Auto-Normalizada 80m)
          </h2>
          <p className="text-xs text-slate-400">
            {meta.name} — <span className="text-slate-300">{meta.regime_info}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <label className="flex items-center gap-1.5 text-slate-300">
            Girar:
            <input
              type="range"
              aria-label="Girar malha 3D"
              min={-85}
              max={85}
              value={rotAzimuth}
              onChange={(e) => setRotAzimuth(Number(e.target.value))}
              className="w-20 accent-sky-400 cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-1.5 text-slate-300">
            Inclinar:
            <input
              type="range"
              aria-label="Inclinar malha 3D"
              min={25}
              max={78}
              value={rotPitch}
              onChange={(e) => setRotPitch(Number(e.target.value))}
              className="w-20 accent-sky-400 cursor-pointer"
            />
          </label>
          <button
            type="button"
            data-testid="reset-3d-btn"
            onClick={() => {
              setRotAzimuth(DEFAULT_AZIMUTH);
              setRotPitch(DEFAULT_PITCH);
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
          >
            Reset 3D
          </button>
        </div>
      </div>

      <TerrainCanvas
        pixels={pixels}
        selectedPixelId={selectedPixel.id}
        losVector={meta.los_vector}
        azimuthDeg={rotAzimuth}
        pitchDeg={rotPitch}
        onSelectPixel={onSelectPixel}
        onRotateChange={(az, pitch) => {
          setRotAzimuth(az);
          setRotPitch(pitch);
        }}
      />

      <PixelInfoBar pixel={selectedPixel} />
    </div>
  );
}

