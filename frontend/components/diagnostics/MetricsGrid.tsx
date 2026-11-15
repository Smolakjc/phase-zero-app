"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";

export interface MetricsGridProps {
  status: AnalysisStatus;
}

export function MetricsGrid({ status }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-3 divide-x divide-[var(--pz-border)] py-0.5">
      <div className="pr-2.5 text-left">
        <span className="text-[10px] text-[var(--pz-muted)] block">Velocidade</span>
        <span
          data-testid="metric-velocity"
          className="text-xs font-mono tabular-nums font-bold text-[var(--pz-text)] mt-0.5 block"
        >
          {status.residual_trend_mm_per_pass}{" "}
          <span className="text-[10px] text-[var(--pz-muted)] font-normal">mm/c</span>
        </span>
      </div>
      <div className="px-2.5 text-left">
        <span className="text-[10px] text-[var(--pz-muted)] block">Aceleração</span>
        <span
          data-testid="metric-acceleration"
          className="text-xs font-mono tabular-nums font-bold text-[var(--pz-text)] mt-0.5 block"
        >
          {status.acceleration_index_mm}{" "}
          <span className="text-[10px] text-[var(--pz-muted)] font-normal">mm</span>
        </span>
      </div>
      <div className="pl-2.5 text-left">
        <span className="text-[10px] text-[var(--pz-muted)] block">Score (γ)</span>
        <span
          data-testid="metric-score"
          className="text-xs font-mono tabular-nums font-bold text-[var(--pz-accent)] mt-0.5 block"
        >
          {status.max_weighted_anomaly_score}
        </span>
      </div>
    </div>
  );
}
