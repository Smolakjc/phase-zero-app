"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";

export interface MetricsGridProps {
  status: AnalysisStatus;
}

export function MetricsGrid({ status }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-[var(--pz-surface)] px-2.5 py-2 rounded-lg border border-[var(--pz-border)]">
        <span className="text-[11px] text-[var(--pz-muted)] block">Velocidade</span>
        <span
          data-testid="metric-velocity"
          className="text-xs font-mono tabular-nums font-semibold text-[var(--pz-text)] mt-0.5 block"
        >
          {status.residual_trend_mm_per_pass} <span className="text-[var(--pz-muted)] font-normal">mm/c</span>
        </span>
      </div>
      <div className="bg-[var(--pz-surface)] px-2.5 py-2 rounded-lg border border-[var(--pz-border)]">
        <span className="text-[11px] text-[var(--pz-muted)] block">Aceleração</span>
        <span
          data-testid="metric-acceleration"
          className="text-xs font-mono tabular-nums font-semibold text-[var(--pz-text)] mt-0.5 block"
        >
          {status.acceleration_index_mm} <span className="text-[var(--pz-muted)] font-normal">mm</span>
        </span>
      </div>
      <div className="bg-[var(--pz-surface)] px-2.5 py-2 rounded-lg border border-[var(--pz-border)]">
        <span className="text-[11px] text-[var(--pz-muted)] block">Score (γ)</span>
        <span
          data-testid="metric-score"
          className="text-xs font-mono tabular-nums font-semibold text-[var(--pz-accent)] mt-0.5 block"
        >
          {status.max_weighted_anomaly_score}
        </span>
      </div>
    </div>
  );
}
