"use client";

import React from "react";
import { ScenarioMeta } from "@phase-zero/shared";

export interface DataSourceBadgesProps {
  meta: ScenarioMeta;
}

/**
 * Badges informativos de procedência dos dados (`R-F4`):
 * Exibe claramente se o clima NASA POWER é real ou sintético, a contagem de granules CMR,
 * o status do stream HDF5 remoto e o sensor utilizado.
 */
export function DataSourceBadges({ meta }: DataSourceBadgesProps) {
  return (
    <div
      data-testid="data-source-badges"
      className="flex flex-wrap items-center gap-2 text-xs font-mono"
    >
      <span
        className={`px-2.5 py-1 rounded border ${
          meta.power_real_ok
            ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
            : "bg-amber-950/80 text-amber-300 border-amber-700"
        }`}
      >
        ☀️ Clima NASA POWER: {meta.power_real_ok ? "Real (Live API)" : "Sintético (Fallback)"}
      </span>

      <span className="px-2.5 py-1 rounded bg-slate-900 text-sky-300 border border-slate-700">
        📦 CMR Granules: {meta.cmr_granules_count}
      </span>

      <span
        className={`px-2.5 py-1 rounded border ${
          meta.h5_streamed_ok
            ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
            : "bg-slate-900 text-slate-300 border-slate-700"
        }`}
      >
        📡 Stream HDF5: {meta.h5_streamed_ok ? "Nuvem NASA (.h5 Real)" : "Modelo Calibrado / DEM"}
      </span>

      <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700">
        🛰️ Sensor: {meta.sensor}
      </span>
    </div>
  );
}

