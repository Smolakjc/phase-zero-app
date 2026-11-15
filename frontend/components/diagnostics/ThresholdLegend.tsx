"use client";

import React from "react";
import { CLASSIFICATION_THRESHOLDS } from "@phase-zero/shared";

export function ThresholdLegend() {
  const {
    GREEN_MAX_SLOPE_MM_PER_PASS,
    GREEN_MAX_SCORE,
    YELLOW_MAX_SLOPE_MM_PER_PASS,
    YELLOW_MAX_ACCEL_MM,
    YELLOW_MAX_SCORE,
  } = CLASSIFICATION_THRESHOLDS;

  return (
    <details className="group pt-2 border-t border-[var(--pz-border)] text-xs text-[var(--pz-muted)]">
      <summary className="flex items-center justify-between cursor-pointer list-none hover:text-[var(--pz-text)] transition-colors select-none py-1">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
            <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold text-[var(--pz-secondary)]">Critérios e Limiares Operacionais</span>
        </span>
        <span className="text-[10px] text-[var(--pz-muted)] group-open:rotate-180 transition-transform duration-200">
          ▼
        </span>
      </summary>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 font-mono tabular-nums text-[11px]">
        <div className="p-2.5 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-emerald-500 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span>Verde (Estável)</span>
          </div>
          <div className="text-[10px] text-[var(--pz-secondary)] leading-relaxed">
            |Vel| &lt; {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/c e Score &lt; {GREEN_MAX_SCORE.toFixed(1)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-amber-500 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
            <span>Amarelo (Atenção)</span>
          </div>
          <div className="text-[10px] text-[var(--pz-secondary)] leading-relaxed">
            |Vel| {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)}–{YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/c ou |Acel| &lt; {YELLOW_MAX_ACCEL_MM.toFixed(1)} mm
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--pz-surface)] border border-[var(--pz-border)] space-y-1">
          <div className="flex items-center gap-1.5 font-sans font-bold text-rose-500 text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
            <span>Vermelho (Crítico)</span>
          </div>
          <div className="text-[10px] text-[var(--pz-secondary)] leading-relaxed">
            |Vel| &ge; {YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/c, |Acel| &ge; {YELLOW_MAX_ACCEL_MM.toFixed(1)} ou Score &ge; {YELLOW_MAX_SCORE.toFixed(1)}
          </div>
        </div>
      </div>
    </details>
  );
}
