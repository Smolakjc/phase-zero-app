"use client";

import React from "react";
import { AnalysisStatus, StatusCode } from "@phase-zero/shared";
import {
  STATUS_CARD_CLASSES,
  STATUS_TIER_LABEL,
  stripDecorativeEmojis,
} from "../../lib/colors";
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "../icons/SurveyIcons";

export interface StatusCardProps {
  status: AnalysisStatus;
}

const STATUS_ICON: Record<StatusCode, React.ReactNode> = {
  GREEN: <CheckCircleIcon className="w-4 h-4 text-[#22c55e] shrink-0" />,
  YELLOW: <AlertTriangleIcon className="w-4 h-4 text-[#eab308] shrink-0" />,
  RED: <AlertOctagonIcon className="w-4 h-4 text-[#f43f5e] shrink-0" />,
};

export function StatusCard({ status }: StatusCardProps) {
  const cleanLabel = stripDecorativeEmojis(status.label);
  const cleanDesc = stripDecorativeEmojis(status.description);

  return (
    <div
      data-testid="status-card"
      data-status-code={status.code}
      className={`p-3.5 rounded-md border transition-colors ${STATUS_CARD_CLASSES[status.code]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          {STATUS_ICON[status.code]}
          <span>Nível {STATUS_TIER_LABEL[status.code]}</span>
        </span>
        <span className="text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded bg-[#080b0f]/75 border border-white/10">
          Score {status.max_weighted_anomaly_score}
        </span>
      </div>

      <div data-testid="status-label" className="text-base font-bold mt-1.5 tracking-tight">
        {cleanLabel}
      </div>
      <p className="text-xs mt-1 leading-relaxed opacity-90">{cleanDesc}</p>
    </div>
  );
}
