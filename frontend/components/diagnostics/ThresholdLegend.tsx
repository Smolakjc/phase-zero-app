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
    <details className="group pt-2 border-t border-[var(--pz-border)] text-[11px] text-[var(--pz-muted)]">
      <summary className="flex items-center justify-between cursor-pointer list-none hover:text-[var(--pz-text)] transition-colors select-none">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" aria-hidden="true" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" aria-hidden="true" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" aria-hidden="true" />
          <span>Regras de Limiares</span>
        </span>
        <span className="text-[10px] text-[var(--pz-muted)] group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>

      <div className="space-y-1.5 pt-2 font-mono tabular-nums text-[10px]">
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-[var(--pz-text)] font-sans">Verde:</strong> |Vel| &lt;{" "}
            {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/c e Score &lt; {GREEN_MAX_SCORE.toFixed(1)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-[var(--pz-text)] font-sans">Amarelo:</strong> |Vel|{" "}
            {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)}–{YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)}, |Acel| &lt;{" "}
            {YELLOW_MAX_ACCEL_MM.toFixed(1)} e Score &lt; {YELLOW_MAX_SCORE.toFixed(1)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f43f5e] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-[var(--pz-text)] font-sans">Vermelho:</strong> |Vel| &ge;{" "}
            {YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)}, |Acel| &ge; {YELLOW_MAX_ACCEL_MM.toFixed(1)} ou Score &ge;{" "}
            {YELLOW_MAX_SCORE.toFixed(1)}
          </span>
        </div>
      </div>
    </details>
  );
}
