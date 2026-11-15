"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";

export interface MetricsGridProps {
  status: AnalysisStatus;
}

export function MetricsGrid({ status }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 py-1">
      <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] text-left hover:border-[var(--pz-border-strong)] transition-colors">
        <span className="text-[10px] uppercase tracking-wider text-[var(--pz-muted)] font-semibold block">
          Velocidade LOS
        </span>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            data-testid="metric-velocity"
            className="text-sm sm:text-base font-mono tabular-nums font-bold text-[var(--pz-text)]"
          >
            {status.residual_trend_mm_per_pass}
          </span>
          <span className="text-[10px] font-mono text-[var(--pz-muted)]">mm/c</span>
        </div>
        <span className="text-[9px] text-[var(--pz-muted)] block mt-0.5">Taxa por passagem</span>
      </div>

      <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] text-left hover:border-[var(--pz-border-strong)] transition-colors">
        <span className="text-[10px] uppercase tracking-wider text-[var(--pz-muted)] font-semibold block">
          Aceleração
        </span>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            data-testid="metric-acceleration"
            className="text-sm sm:text-base font-mono tabular-nums font-bold text-[var(--pz-text)]"
          >
            {status.acceleration_index_mm}
          </span>
          <span className="text-[10px] font-mono text-[var(--pz-muted)]">mm</span>
        </div>
        <span className="text-[9px] text-[var(--pz-muted)] block mt-0.5">Derivada discreta</span>
      </div>

      <div className="p-3 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] text-left hover:border-[var(--pz-border-strong)] transition-colors">
        <span className="text-[10px] uppercase tracking-wider text-[var(--pz-muted)] font-semibold block">
          Score γ Ponderado
        </span>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            data-testid="metric-score"
            className="text-sm sm:text-base font-mono tabular-nums font-bold text-[var(--pz-accent)]"
          >
            {status.max_weighted_anomaly_score}
          </span>
          <span className="text-[10px] font-mono text-[var(--pz-muted)]">/ 100</span>
        </div>
        <span className="text-[9px] text-[var(--pz-muted)] block mt-0.5">Coerência espacial</span>
      </div>
    </div>
  );
}
