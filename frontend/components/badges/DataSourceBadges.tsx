"use client";

import React from "react";
import { AppeearsThermoPluvioAnalysis, ScenarioMeta } from "@phase-zero/shared";

export interface DataSourceBadgesProps {
  meta: ScenarioMeta;
  appeears?: AppeearsThermoPluvioAnalysis;
}

/**
 * Indicadores compactos e enxutos de procedência física dos dados (`R-F4`).
 */
export function DataSourceBadges({ meta, appeears }: DataSourceBadgesProps) {
  return (
    <div
      data-testid="data-source-badges"
      className="flex flex-wrap items-center gap-1.5 text-[10px]"
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
          meta.power_real_ok ? "pz-status-green" : "pz-status-yellow"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            meta.power_real_ok ? "bg-[#10b981]" : "bg-[#f59e0b]"
          }`}
          aria-hidden="true"
        />
        <span>NASA POWER: {meta.power_real_ok ? "Real" : "Fallback"}</span>
      </span>

      {appeears && (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
            appeears.danger_tier === "RED"
              ? "pz-status-red"
              : appeears.danger_tier === "YELLOW"
                ? "pz-status-yellow"
                : "pz-status-green"
          }`}
        >
          <span>
            AppEEARS LST ({appeears.five_year_baseline.years_analyzed.length}a):{" "}
            {appeears.is_future_prediction ? "Previsão" : "Ativo"}
          </span>
        </span>
      )}

      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pz-well)] text-[var(--pz-secondary)] border border-[var(--pz-border)] whitespace-nowrap">
        <span>CMR:</span>
        <span className="font-mono tabular-nums font-semibold text-[var(--pz-text)]">
          {meta.cmr_granules_count}
        </span>
      </span>

      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full border whitespace-nowrap ${
          meta.h5_streamed_ok
            ? "pz-status-green"
            : "bg-[var(--pz-well)] text-[var(--pz-muted)] border-[var(--pz-border)]"
        }`}
      >
        HDF5: {meta.h5_streamed_ok ? "Cloud (.h5)" : "Modelo DEM"}
      </span>

      <span
        title={meta.sensor}
        className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--pz-well)] text-[var(--pz-muted)] border border-[var(--pz-border)] font-mono max-w-[260px]"
      >
        <span className="truncate">{meta.sensor}</span>
      </span>
    </div>
  );
}
