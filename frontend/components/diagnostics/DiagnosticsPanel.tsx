"use client";

import React from "react";
import { AnalysisRequest, AnalysisStatus } from "@phase-zero/shared";
import { CoherenceSlider } from "./CoherenceSlider";
import { CompensationToggles } from "./CompensationToggles";
import { MetricsGrid } from "./MetricsGrid";
import { StatusCard } from "./StatusCard";
import { ThresholdLegend } from "./ThresholdLegend";

export interface DiagnosticsPanelProps {
  status: AnalysisStatus;
  params: AnalysisRequest;
  minCoherenceDraft: number;
  onSetParam: <K extends keyof AnalysisRequest>(key: K, value: AnalysisRequest[K]) => void;
  onSetMinCoherenceDraft: (val: number) => void;
}

export function DiagnosticsPanel({
  status,
  params,
  minCoherenceDraft,
  onSetParam,
  onSetMinCoherenceDraft,
}: DiagnosticsPanelProps) {
  return (
    <aside
      aria-labelledby="diagnostics-heading"
      className="bg-[#10141b] border border-[#222933] rounded-lg p-4 flex flex-col gap-3.5 h-full"
    >
      <div className="flex items-center justify-between border-b border-[#222933] pb-2.5">
        <h2 id="diagnostics-heading" className="text-sm font-bold text-[#eef2f6]">
          Diagnóstico Estrutural
        </h2>
        <span className="text-[11px] text-[#8a96a8]">Pixel de referência</span>
      </div>

      <StatusCard status={status} />

      <div className="p-3 rounded-md bg-[#131820] border border-[#222933] space-y-2.5">
        <div className="text-xs font-semibold text-[#cbd5e1]">
          Métricas Decisórias e Limiares
        </div>
        <MetricsGrid status={status} />
        <ThresholdLegend />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#cbd5e1]">
          Estágios de Compensação Física
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
