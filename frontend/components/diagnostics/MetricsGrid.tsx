"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";

export interface MetricsGridProps {
  status: AnalysisStatus;
}

export function MetricsGrid({ status }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center font-mono">
      <div className="bg-slate-900 p-2 rounded border border-slate-800">
        <span className="text-[10px] text-slate-400 block">1. Velocidade</span>
        <span data-testid="metric-velocity" className="text-xs font-bold text-white">
          {status.residual_trend_mm_per_pass} mm/ciclo
        </span>
      </div>
      <div className="bg-slate-900 p-2 rounded border border-slate-800">
        <span className="text-[10px] text-slate-400 block">2. Aceleração</span>
        <span data-testid="metric-acceleration" className="text-xs font-bold text-white">
          {status.acceleration_index_mm} mm
        </span>
      </div>
      <div className="bg-slate-900 p-2 rounded border border-slate-800">
        <span className="text-[10px] text-slate-400 block">3. Score (γ)</span>
        <span data-testid="metric-score" className="text-xs font-bold text-sky-400">
          {status.max_weighted_anomaly_score}
        </span>
      </div>
    </div>
  );
}

