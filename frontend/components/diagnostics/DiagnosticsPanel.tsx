"use client";

import React from "react";
import {
  AnalysisRequest,
  AnalysisStatus,
  AppeearsThermoPluvioAnalysis,
} from "@phase-zero/shared";
import { CoherenceSlider } from "./CoherenceSlider";
import { CompensationToggles } from "./CompensationToggles";
import { MetricsGrid } from "./MetricsGrid";
import { StatusCard } from "./StatusCard";
import { ThresholdLegend } from "./ThresholdLegend";

export interface DiagnosticsPanelProps {
  status: AnalysisStatus;
  appeears?: AppeearsThermoPluvioAnalysis;
  params: AnalysisRequest;
  minCoherenceDraft: number;
  onSetParam: <K extends keyof AnalysisRequest>(key: K, value: AnalysisRequest[K]) => void;
  onSetMinCoherenceDraft: (val: number) => void;
}

export function DiagnosticsPanel({
  status,
  appeears,
  params,
  minCoherenceDraft,
  onSetParam,
  onSetMinCoherenceDraft,
}: DiagnosticsPanelProps) {
  return (
    <aside
      aria-labelledby="diagnostics-heading"
      className="flex flex-col gap-2.5 h-full"
    >
      <div className="flex items-center justify-between border-b border-[var(--pz-border)] pb-1.5">
        <h2 id="diagnostics-heading" className="text-xs sm:text-sm font-bold text-[var(--pz-text)]">
          Diagnóstico InSAR
        </h2>
        <span className="text-[10px] text-[var(--pz-muted)] font-mono">Pixel Crítico</span>
      </div>

      <StatusCard status={status} appeears={appeears} />

      <div className="p-2.5 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] space-y-1.5">
        <div className="text-[11px] font-semibold text-[var(--pz-secondary)]">
          Métricas Decisórias
        </div>
        <MetricsGrid status={status} />
        <ThresholdLegend />
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-[var(--pz-secondary)] px-0.5">
          Compensação Física
        </div>
        <CompensationToggles
          applyIonosphere={params.apply_ionosphere}
          applyTroposphere={params.apply_troposphere}
          applySolidTides={params.apply_solid_tides}
          applyNasaPower={params.apply_nasa_power}
          onToggleIonosphere={(v) => onSetParam("apply_ionosphere", v)}
          onToggleTroposphere={(v) => onSetParam("apply_troposphere", v)}
          onToggleSolidTides={(v) => onSetParam("apply_solid_tides", v)}
          onToggleNasaPower={(v) => onSetParam("apply_nasa_power", v)}
        />
      </div>

      <CoherenceSlider value={minCoherenceDraft} onChange={onSetMinCoherenceDraft} />
    </aside>
  );
}
