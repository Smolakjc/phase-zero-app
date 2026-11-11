"use client";

import React from "react";
import { ScenarioItem } from "@phase-zero/shared";
import { isValidEarthdataToken } from "../../lib/tokenStorage";
import { BrandMarkIcon, KeyIcon, RefreshIcon, SatelliteIcon } from "../icons/SurveyIcons";
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
    <header className="bg-[#0e1218] border-b border-[#222933]">
      <div className="max-w-[1640px] mx-auto px-4 lg:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-[#132538] border border-[#254d73] text-[#3b9eeb]">
              <BrandMarkIcon className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-base font-bold tracking-[0.02em] text-[#eef2f6] leading-tight">
                PHASE-ZERO
              </h1>
              <p className="text-[11px] text-[#8a96a8] hidden sm:block leading-tight">
                Triagem InSAR e Compensação Ambiental
              </p>
            </div>
          </div>

          <div className="hidden 2xl:flex items-center">
            {latestGranuleLabel && (
              <span
                title={latestGranuleLabel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#131820] border border-[#222933] text-[11px] font-mono tabular-nums text-[#a1adbf] max-w-[240px]"
              >
                <SatelliteIcon className="w-3.5 h-3.5 text-[#3b9eeb] shrink-0" />
                <span className="truncate">{latestGranuleLabel}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid="open-token-modal-btn"
            onClick={onOpenTokenModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
              hasValidToken
                ? "bg-[#0d2016] text-[#86efac] border-[#1f5e39] hover:border-[#2e8552]"
                : "bg-[#131820] text-[#cbd5e1] border-[#313b49] hover:border-[#3b9eeb] hover:text-[#eef2f6]"
            }`}
          >
            <KeyIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hasValidToken ? "Token Earthdata: Ativo" : "Token Earthdata"}
            </span>
          </button>

          {revalidating && (
            <span
              data-testid="revalidating-badge"
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#132538] border border-[#254d73] text-[11px] font-medium text-[#93c5fd] shrink-0"
            >
              <RefreshIcon className="w-3 h-3 animate-spin" />
              <span>Atualizando</span>
            </span>
          )}
        </div>

        <ScenarioSelector
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelect={onSelectScenario}
        />
      </div>
    </header>
  );
}
