"use client";

import React, { useState } from "react";
import { GridPixel, ScenarioMeta } from "@phase-zero/shared";
import { stripDecorativeEmojis } from "../../lib/colors";
import { RotateResetIcon } from "../icons/SurveyIcons";
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
 * Painel do Viewport Topográfico 3D (`K-F1` + `K-F2`).
 */
export function TerrainViewport3D({
  meta,
  pixels,
  selectedPixel,
  onSelectPixel,
}: TerrainViewport3DProps) {
  const [rotAzimuth, setRotAzimuth] = useState<number>(DEFAULT_AZIMUTH);
  const [rotPitch, setRotPitch] = useState<number>(DEFAULT_PITCH);

  const cleanName = stripDecorativeEmojis(meta.name);
  const cleanRegime = stripDecorativeEmojis(meta.regime_info);

  return (
    <section
      aria-labelledby="terrain-3d-heading"
      className="bg-[#131820] border border-[#222933] rounded-lg p-4 flex flex-col justify-between gap-3"
    >
      <div className="flex flex-wrap justify-between items-start gap-2.5">
        <div className="min-w-0">
          <h2 id="terrain-3d-heading" className="text-sm font-bold text-[#eef2f6]">
            Malha Topográfica 3D (80m × 80m)
          </h2>
          <p className="text-xs text-[#8a96a8] mt-0.5 truncate" title={`${cleanName} — ${cleanRegime}`}>
            <span className="text-[#cbd5e1]">{cleanName}</span> · {cleanRegime}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs bg-[#080b0f] px-2.5 py-1.5 rounded-md border border-[#222933]">
          <label className="flex items-center gap-1.5 text-[#a1adbf]">
            <span>Azimute</span>
            <input
              type="range"
              aria-label="Girar malha 3D"
              min={-85}
              max={85}
              value={rotAzimuth}
              onChange={(e) => setRotAzimuth(Number(e.target.value))}
              className="pz-range w-16"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[#a1adbf]">
            <span>Inclinação</span>
            <input
              type="range"
              aria-label="Inclinar malha 3D"
              min={25}
              max={78}
              value={rotPitch}
              onChange={(e) => setRotPitch(Number(e.target.value))}
              className="pz-range w-16"
            />
          </label>
          <button
            type="button"
            data-testid="reset-3d-btn"
            onClick={() => {
              setRotAzimuth(DEFAULT_AZIMUTH);
              setRotPitch(DEFAULT_PITCH);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181e28] hover:bg-[#222b39] text-[#eef2f6] border border-[#313b49] text-[11px] font-medium transition-colors cursor-pointer"
          >
            <RotateResetIcon className="w-3 h-3 text-[#3b9eeb]" />
            <span>Reset</span>
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
    </section>
  );
}
