"use client";

import React from "react";
import { ScenarioItem } from "@phase-zero/shared";

export interface ScenarioSelectorProps {
  scenarios: readonly ScenarioItem[];
  activeScenarioId: string;
  onSelect: (id: string, defaultStart: string, defaultEnd: string) => void;
}

export function ScenarioSelector({
  scenarios,
  activeScenarioId,
  onSelect,
}: ScenarioSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Cenários Calibrados">
      {scenarios.map((sc) => {
        const isActive = activeScenarioId === sc.id;
        return (
          <button
            key={sc.id}
            type="button"
            data-testid={`scenario-btn-${sc.id}`}
            aria-pressed={isActive}
            onClick={() => onSelect(sc.id, sc.default_start, sc.default_end)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${
              isActive
                ? "bg-sky-600 text-white border-sky-400 scale-[1.02] shadow-lg shadow-sky-900/50"
                : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            {sc.label}
          </button>
        );
      })}
    </div>
  );
}

