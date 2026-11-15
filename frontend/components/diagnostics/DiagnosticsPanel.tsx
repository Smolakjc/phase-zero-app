"use client";

import React from "react";
import {
  AnalysisRequest,
  AnalysisStatus,
  AppeearsThermoPluvioAnalysis,
} from "@phase-zero/shared";
import { StatusCard } from "./StatusCard";

export interface DiagnosticsPanelProps {
  status: AnalysisStatus;
  appeears?: AppeearsThermoPluvioAnalysis;
  params?: AnalysisRequest;
  minCoherenceDraft?: number;
  onSetParam?: <K extends keyof AnalysisRequest>(key: K, value: AnalysisRequest[K]) => void;
  onSetMinCoherenceDraft?: (val: number) => void;
}

export function DiagnosticsPanel({
  status,
  appeears,
}: DiagnosticsPanelProps) {
  return (
    <aside
      aria-labelledby="diagnostics-heading"
      className="flex flex-col gap-2.5 w-full"
    >
      <div className="flex items-center justify-between border-b border-[var(--pz-border)] pb-1.5">
        <h2 id="diagnostics-heading" className="text-xs sm:text-sm font-bold text-[var(--pz-text)]">
          Diagnóstico InSAR
        </h2>
        <span className="text-[10px] text-[var(--pz-muted)] font-mono">Pixel Crítico</span>
      </div>

      <StatusCard status={status} appeears={appeears} />
    </aside>
  );
}
