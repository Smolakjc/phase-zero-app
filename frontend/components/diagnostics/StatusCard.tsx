"use client";

import React from "react";
import { AnalysisStatus } from "@phase-zero/shared";
import { STATUS_CARD_CLASSES, STATUS_EMOJI } from "../../lib/colors";

export interface StatusCardProps {
  status: AnalysisStatus;
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <div
      data-testid="status-card"
      data-status-code={status.code}
      className={`p-3.5 rounded-xl border transition-all duration-300 ${STATUS_CARD_CLASSES[status.code]} mb-3`}
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono uppercase opacity-80">Diagnóstico Automático</span>
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30">
          Score (γ): {status.max_weighted_anomaly_score}
        </span>
      </div>
      <div data-testid="status-label" className="text-base font-extrabold mt-1 tracking-tight">
        {STATUS_EMOJI[status.code]} {status.label}
      </div>
      <p className="text-[11px] mt-1 leading-relaxed opacity-95">{status.description}</p>
    </div>
  );
}

