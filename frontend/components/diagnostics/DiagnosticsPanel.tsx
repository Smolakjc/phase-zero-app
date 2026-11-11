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
    <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
      <div>
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400 mb-2.5">
          2. Diagnóstico &amp; Métricas de Decisão
        </h2>

        <StatusCard status={status} />

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-3 space-y-2">
          <div className="text-[11px] font-mono uppercase text-sky-400 font-bold">
            📊 Índices Atuais Calculados vs. Regras de Cor:
          </div>
          <MetricsGrid status={status} />
          <ThresholdLegend />
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

        <CoherenceSlider value={minCoherenceDraft} onChange={onSetMinCoherenceDraft} />
      </div>
    </div>
  );
}

