"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";

export interface MetricsGridProps {
  status: AnalysisStatus;
}

export function MetricsGrid({ status }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-[#080b0f] px-2.5 py-2 rounded-md border border-[#222933]">
        <span className="text-[11px] text-[#8a96a8] block">Velocidade</span>
        <span
          data-testid="metric-velocity"
          className="text-xs font-mono tabular-nums font-semibold text-[#eef2f6] mt-0.5 block"
        >
          {status.residual_trend_mm_per_pass} <span className="text-[#8a96a8] font-normal">mm/c</span>
        </span>
      </div>
      <div className="bg-[#080b0f] px-2.5 py-2 rounded-md border border-[#222933]">
        <span className="text-[11px] text-[#8a96a8] block">Aceleração</span>
        <span
          data-testid="metric-acceleration"
          className="text-xs font-mono tabular-nums font-semibold text-[#eef2f6] mt-0.5 block"
        >
          {status.acceleration_index_mm} <span className="text-[#8a96a8] font-normal">mm</span>
        </span>
      </div>
      <div className="bg-[#080b0f] px-2.5 py-2 rounded-md border border-[#222933]">
        <span className="text-[11px] text-[#8a96a8] block">Score (γ)</span>
        <span
          data-testid="metric-score"
          className="text-xs font-mono tabular-nums font-semibold text-[#3b9eeb] mt-0.5 block"
        >
          {status.max_weighted_anomaly_score}
        </span>
      </div>
    </div>
  );
}
