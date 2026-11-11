"use client";

import React from "react";
import { ScenarioItem } from "@phase-zero/shared";
import { stripDecorativeEmojis } from "../../lib/colors";

export interface ScenarioSelectorProps {
  scenarios: readonly ScenarioItem[];
  activeScenarioId: string;
  onSelect: (id: string, defaultStart: string, defaultEnd: string) => void;
}

const SCENARIO_DOT_COLOR: Record<string, string> = {
  itaipu_normal: "bg-[#22c55e]",
  gongo_soco_active: "bg-[#eab308]",
  maceio_subsidence: "bg-[#f43f5e]",
  brumadinho_hist: "bg-[#f43f5e]",
};

export function ScenarioSelector({
  scenarios,
  activeScenarioId,
  onSelect,
}: ScenarioSelectorProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 shrink-0"
      aria-label="Cenários calibrados"
    >
      {scenarios.map((sc) => {
        const isActive = activeScenarioId === sc.id;
        const cleanLabel = stripDecorativeEmojis(sc.label);
        const dotClass = SCENARIO_DOT_COLOR[sc.id] ?? "bg-[#3b9eeb]";

        return (
          <button
            key={sc.id}
            type="button"
            data-testid={`scenario-btn-${sc.id}`}
            aria-pressed={isActive}
            onClick={() => onSelect(sc.id, sc.default_start, sc.default_end)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
              isActive
                ? "bg-[#132538] text-[#eef2f6] border-[#3b9eeb]"
                : "bg-[#131820] text-[#a1adbf] border-[#222933] hover:border-[#313b49] hover:text-[#eef2f6]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}
              aria-hidden="true"
            />
            <span>{cleanLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
