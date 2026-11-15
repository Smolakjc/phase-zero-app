"use client";

import React from "react";
import {
  AnalysisStatus,
  AppeearsThermoPluvioAnalysis,
  StatusCode,
} from "@phase-zero/shared";
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
  appeears?: AppeearsThermoPluvioAnalysis;
}

const STATUS_ICON: Record<StatusCode, React.ReactNode> = {
  GREEN: <CheckCircleIcon className="w-4 h-4 text-[var(--pz-ok-ink)] shrink-0" />,
  YELLOW: <AlertTriangleIcon className="w-4 h-4 text-[var(--pz-warn-ink)] shrink-0" />,
  RED: <AlertOctagonIcon className="w-4 h-4 text-[var(--pz-danger-ink)] shrink-0" />,
};

export function StatusCard({ status, appeears }: StatusCardProps) {
  const cleanLabel = stripDecorativeEmojis(status.label);
  const cleanDesc = stripDecorativeEmojis(status.description);

  return (
    <div
      data-testid="status-card"
      data-status-code={status.code}
      className={`p-3.5 rounded-xl border transition-colors ${STATUS_CARD_CLASSES[status.code]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          {STATUS_ICON[status.code]}
          <span>Nível {STATUS_TIER_LABEL[status.code]}</span>
        </span>
        <span className="text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md bg-[var(--pz-surface)] text-[var(--pz-text)] border border-[var(--pz-border)]">
          Score {status.max_weighted_anomaly_score}
        </span>
      </div>

      <div data-testid="status-label" className="text-base font-bold mt-1.5 tracking-tight">
        {cleanLabel}
      </div>
      <p className="text-xs mt-1 leading-relaxed opacity-95">{cleanDesc}</p>

      {appeears && (
        <div className="mt-2.5 pt-2 border-t border-[var(--pz-border)] space-y-1 text-[11px]">
          <div className="font-bold">{appeears.core_question}</div>
          <div className="font-mono font-semibold">
            {appeears.verdict_short}
          </div>
          <div className="opacity-90 font-mono">
            Quente→Frio: {appeears.current_or_predicted_metrics.max_hot_to_cold_drop_c}°C · Chuva:{" "}
            {appeears.current_or_predicted_metrics.precip_total_mm} mm · Discrepância 5a:{" "}
            {appeears.five_year_baseline.discrepancy_score}/100
          </div>
        </div>
      )}

      {status.significance && (
        <div className="mt-2.5 pt-2 border-t border-[var(--pz-border)] flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          <span className="opacity-90">
            Mann-Kendall: <span className="font-mono font-semibold tabular-nums">p = {status.significance.p_value}</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              status.significance.is_significant
                ? "pz-status-red"
                : "bg-[var(--pz-surface)] text-[var(--pz-secondary)] border-[var(--pz-border)]"
            }`}
          >
            {status.significance.is_significant
              ? `Tendência Significativa (${status.significance.confidence_level})`
              : "Estacionário / Ruído"}
          </span>
        </div>
      )}
    </div>
  );
}
