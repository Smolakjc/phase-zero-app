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

const STATUS_GLOW_CLASS: Record<StatusCode, string> = {
  GREEN: "border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.06)]",
  YELLOW: "border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.08)]",
  RED: "border-rose-500/40 hover:border-rose-500/60 shadow-[0_0_28px_rgba(244,63,94,0.12)]",
};

const STATUS_DOT_COLOR: Record<StatusCode, string> = {
  GREEN: "bg-emerald-400",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500",
};

export function StatusCard({ status, appeears }: StatusCardProps) {
  const cleanLabel = stripDecorativeEmojis(status.label);
  const cleanDesc = stripDecorativeEmojis(status.description);

  return (
    <div
      data-testid="status-card"
      data-status-code={status.code}
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-md ${STATUS_CARD_CLASSES[status.code]} ${STATUS_GLOW_CLASS[status.code]}`}
    >
      {/* Barra superior de telemetria */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--pz-surface)]/80 border border-[var(--pz-border)] text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT_COLOR[status.code]}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${STATUS_DOT_COLOR[status.code]}`}
            />
          </span>
          <span className="uppercase tracking-wider text-[10px] font-bold">
            {STATUS_TIER_LABEL[status.code]}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--pz-surface)]/80 text-[var(--pz-text)] border border-[var(--pz-border)] text-[11px] font-mono tabular-nums font-semibold">
          <span className="text-[10px] text-[var(--pz-muted)] font-sans">Score γ:</span>
          <span>{status.max_weighted_anomaly_score}</span>
        </div>
      </div>

      {/* Título de Status Operacional */}
      <div className="mt-3 space-y-1">
        <div
          data-testid="status-label"
          className="text-base sm:text-lg font-bold tracking-tight text-[var(--pz-text)] flex items-center gap-2"
        >
          {STATUS_ICON[status.code]}
          <span>{cleanLabel}</span>
        </div>
        <p className="text-xs text-[var(--pz-secondary)] leading-relaxed opacity-90 max-w-2xl">
          {cleanDesc}
        </p>
      </div>

      {/* Indicadores de Telemetria Inferiores */}
      <div className="mt-3.5 pt-3 border-t border-[var(--pz-border)]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        {appeears && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--pz-muted)]">Choque Hidrotermal:</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-[var(--pz-surface)]/70 border border-[var(--pz-border)]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  appeears.danger_tier === "RED"
                    ? "bg-rose-500"
                    : appeears.danger_tier === "YELLOW"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                }`}
                aria-hidden="true"
              />
              <span className="font-mono text-[var(--pz-text)]">{appeears.verdict_short}</span>
            </span>
          </div>
        )}

        {status.significance && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--pz-muted)]">Mann-Kendall:</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--pz-surface)]/70 border border-[var(--pz-border)] text-[var(--pz-text)]">
              <span>p = {status.significance.p_value}</span>
              <span className="text-[var(--pz-muted)]">·</span>
              <span
                className={`text-[10px] font-sans font-semibold ${
                  status.significance.is_significant
                    ? "text-[var(--pz-danger-ink)]"
                    : "text-[var(--pz-muted)]"
                }`}
              >
                {status.significance.is_significant ? "Significativo" : "Estacionário"}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
