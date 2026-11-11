"use client";

import React from "react";
import { ScenarioItem } from "@phase-zero/shared";
import { isValidEarthdataToken } from "../../lib/tokenStorage";
import { ScenarioSelector } from "./ScenarioSelector";

export interface HeaderProps {
  scenarios: readonly ScenarioItem[];
  activeScenarioId: string;
  latestGranuleLabel?: string;
  earthdataToken: string;
  revalidating?: boolean;
  onSelectScenario: (id: string, defaultStart: string, defaultEnd: string) => void;
  onOpenTokenModal: () => void;
}

export function Header({
  scenarios,
  activeScenarioId,
  latestGranuleLabel,
  earthdataToken,
  revalidating = false,
  onSelectScenario,
  onOpenTokenModal,
}: HeaderProps) {
  const hasValidToken = isValidEarthdataToken(earthdataToken);

  return (
    <header className="animate-enter-1 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-800/90 pb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-sky-950 text-sky-400 border border-sky-700">
            NASA SPACE APPS 2026 // DANCING WITH THE SARs
          </span>
          {latestGranuleLabel && (
            <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-slate-900 text-emerald-400 border border-slate-700">
              🛰️ {latestGranuleLabel}
            </span>
          )}
          <button
            type="button"
            data-testid="open-token-modal-btn"
            onClick={onOpenTokenModal}
            className={`px-2.5 py-0.5 text-xs font-mono rounded border transition ${
              hasValidToken
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-600"
                : "bg-amber-950/80 text-amber-300 border-amber-600 hover:bg-amber-900"
            }`}
          >
            {hasValidToken
              ? "🔑 NASA Earthdata Token: Ativo"
              : "🔑 Configurar Token NASA Earthdata"}
          </button>
          {revalidating && (
            <span
              data-testid="revalidating-badge"
              className="px-2.5 py-0.5 text-xs font-mono rounded bg-sky-950/80 text-sky-300 border border-sky-600 animate-pulse"
            >
              ⏳ Atualizando dados...
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mt-1.5">
          PHASE-ZERO{" "}
          <span className="text-sky-400 font-light text-xl md:text-2xl">
            // Compensação Ambiental para Detecção de Anomalias via Radar SAR
          </span>
        </h1>
      </div>

      <ScenarioSelector
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelect={onSelectScenario}
      />
    </header>
  );
}

