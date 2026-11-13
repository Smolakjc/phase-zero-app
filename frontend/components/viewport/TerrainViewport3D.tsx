"use client";

import React, { useMemo, useState } from "react";
import { detectZoneCategory, GridPixel, ScenarioMeta, ZoneCategoryId } from "@phase-zero/shared";
import { stripDecorativeEmojis, ZONE_VISUAL_META } from "../../lib/colors";
import { RotateResetIcon } from "../icons/SurveyIcons";
import { PixelInfoBar } from "./PixelInfoBar";
import { TerrainCanvas, TerrainColorMode } from "./TerrainCanvas";

export interface TerrainViewport3DProps {
  meta: ScenarioMeta;
  pixels: readonly GridPixel[];
  selectedPixel: GridPixel;
  onSelectPixel: (px: GridPixel) => void;
}

const DEFAULT_AZIMUTH = 34;
const DEFAULT_PITCH = 54;

const LEGEND_ZONE_ORDER: readonly ZoneCategoryId[] = [
  "WATER",
  "CREST",
  "SLOPE",
  "BERM",
  "ABUTMENT",
  "VEGETATION",
  "VALLEY",
];

/**
 * Painel do Viewport Topográfico 3D (`K-F1` + `K-F2`) com alternância entre
 * modo de Anomalia InSAR e modo de Classificação Geomorfométrica de Zonas.
 */
export function TerrainViewport3D({
  meta,
  pixels,
  selectedPixel,
  onSelectPixel,
}: TerrainViewport3DProps) {
  const [rotAzimuth, setRotAzimuth] = useState<number>(DEFAULT_AZIMUTH);
  const [rotPitch, setRotPitch] = useState<number>(DEFAULT_PITCH);
  const [colorMode, setColorMode] = useState<TerrainColorMode>("anomaly");

  const cleanName = stripDecorativeEmojis(meta.name);
  const cleanRegime = stripDecorativeEmojis(meta.regime_info);

  const zoneCounts = useMemo(() => {
    const counts: Partial<Record<ZoneCategoryId, number>> = {};
    for (const px of pixels) {
      const cat = detectZoneCategory(px.zone);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [pixels]);

  const handleSelectZoneRepresentative = (cat: ZoneCategoryId) => {
    const found = pixels.find((p) => detectZoneCategory(p.zone) === cat);
    if (found) {
      onSelectPixel(found);
    }
  };

  return (
    <section
      aria-labelledby="terrain-3d-heading"
      className="bg-[#131820] border border-[#222933] rounded-lg p-4 flex flex-col justify-between gap-3"
    >
      <div className="flex flex-wrap justify-between items-start gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="terrain-3d-heading" className="text-sm font-bold text-[#eef2f6]">
              Malha Topográfica 3D (80m × 80m)
            </h2>
            <div
              role="group"
              aria-label="Modo de coloração da malha 3D"
              className="inline-flex items-center rounded-md bg-[#080b0f] p-0.5 border border-[#222933]"
            >
              <button
                type="button"
                aria-pressed={colorMode === "anomaly"}
                onClick={() => setColorMode("anomaly")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  colorMode === "anomaly"
                    ? "bg-[#132538] text-[#eef2f6] border border-[#3b9eeb]"
                    : "text-[#a1adbf] hover:text-[#eef2f6] border border-transparent"
                }`}
              >
                Anomalia InSAR
              </button>
              <button
                type="button"
                aria-pressed={colorMode === "zones"}
                onClick={() => setColorMode("zones")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  colorMode === "zones"
                    ? "bg-[#132538] text-[#eef2f6] border border-[#3b9eeb]"
                    : "text-[#a1adbf] hover:text-[#eef2f6] border border-transparent"
                }`}
              >
                Zonas / Setores
              </button>
            </div>
          </div>
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
        colorMode={colorMode}
        onSelectPixel={onSelectPixel}
        onRotateChange={(az, pitch) => {
          setRotAzimuth(az);
          setRotPitch(pitch);
        }}
      />

      <div
        className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#080b0f] border border-[#222933] text-[11px]"
        aria-label="Filtro rápido de zonas geomorfométricas"
      >
        <span className="text-[#8a96a8] mr-1 font-medium">Setores:</span>
        {LEGEND_ZONE_ORDER.map((cat) => {
          const count = zoneCounts[cat] ?? 0;
          if (count === 0) return null;
          const style = ZONE_VISUAL_META[cat];
          const isCurrentCat = detectZoneCategory(selectedPixel.zone) === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleSelectZoneRepresentative(cat)}
              title={`${style.shortLabel}: ${style.radarNote}`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-medium transition-colors cursor-pointer ${
                isCurrentCat
                  ? style.badgeClass
                  : "bg-[#131820] text-[#a1adbf] border-[#222933] hover:text-[#eef2f6]"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: style.dotHex }}
                aria-hidden="true"
              />
              <span>{style.shortLabel}</span>
              <span className="font-mono opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      <PixelInfoBar pixel={selectedPixel} />
    </section>
  );
}
