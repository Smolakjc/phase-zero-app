"use client";

import React from "react";
import { ScenarioMeta } from "@phase-zero/shared";

export interface DataSourceBadgesProps {
  meta: ScenarioMeta;
}

/**
 * Indicadores compactos de procedência física dos dados (`R-F4`).
 */
export function DataSourceBadges({ meta }: DataSourceBadgesProps) {
  return (
    <div
      data-testid="data-source-badges"
      className="flex flex-wrap items-center gap-1.5 text-[11px]"
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap ${
          meta.power_real_ok
            ? "bg-[#0d2016] text-[#86efac] border-[#1f5e39]"
            : "bg-[#20190a] text-[#fde047] border-[#854d0e]"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            meta.power_real_ok ? "bg-[#22c55e]" : "bg-[#eab308]"
          }`}
          aria-hidden="true"
        />
        <span>NASA POWER: {meta.power_real_ok ? "Real" : "Fallback"}</span>
      </span>

      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#131820] text-[#cbd5e1] border border-[#222933] whitespace-nowrap">
        <span>CMR:</span>
        <span className="font-mono tabular-nums text-[#eef2f6]">
          {meta.cmr_granules_count}
        </span>
      </span>

      <span
        className={`inline-flex items-center px-2 py-1 rounded border whitespace-nowrap ${
          meta.h5_streamed_ok
            ? "bg-[#0d2016] text-[#86efac] border-[#1f5e39]"
            : "bg-[#131820] text-[#a1adbf] border-[#222933]"
        }`}
      >
        HDF5: {meta.h5_streamed_ok ? "Cloud (.h5)" : "Modelo DEM"}
      </span>

      <span
        title={meta.sensor}
        className="inline-flex items-center px-2 py-1 rounded bg-[#131820] text-[#a1adbf] border border-[#222933] font-mono max-w-[320px]"
      >
        <span className="truncate">{meta.sensor}</span>
      </span>
    </div>
  );
}
