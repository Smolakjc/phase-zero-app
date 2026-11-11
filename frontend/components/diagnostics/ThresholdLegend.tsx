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
    <div className="text-[11px] text-[#9ba7b8] space-y-1.5 pt-2.5 border-t border-[#222933]">
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0 mt-1" aria-hidden="true" />
        <span>
          <strong className="text-[#eef2f6]">Verde:</strong>{" "}
          <span className="font-mono tabular-nums">
            |Vel| &lt; {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/c e Score &lt;{" "}
            {GREEN_MAX_SCORE.toFixed(1)}
          </span>
        </span>
      </div>
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full bg-[#eab308] shrink-0 mt-1" aria-hidden="true" />
        <span>
          <strong className="text-[#eef2f6]">Amarelo:</strong>{" "}
          <span className="font-mono tabular-nums">
            |Vel| {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)}–{YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)},{" "}
            |Acel| &lt; {YELLOW_MAX_ACCEL_MM.toFixed(1)} e Score &lt; {YELLOW_MAX_SCORE.toFixed(1)}
          </span>
        </span>
      </div>
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full bg-[#f43f5e] shrink-0 mt-1" aria-hidden="true" />
        <span>
          <strong className="text-[#eef2f6]">Vermelho:</strong>{" "}
          <span className="font-mono tabular-nums">
            |Vel| &ge; {YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)}, |Acel| &ge;{" "}
            {YELLOW_MAX_ACCEL_MM.toFixed(1)} ou Score &ge; {YELLOW_MAX_SCORE.toFixed(1)}
          </span>
        </span>
      </div>
    </div>
  );
}
