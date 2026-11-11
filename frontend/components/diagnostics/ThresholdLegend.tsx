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
    <div className="text-[10px] font-mono text-slate-400 space-y-0.5 pt-1 border-t border-slate-900">
      <div>
        🟢 <b>VERDE:</b> |Vel| &lt; {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)} mm/ciclo e Score &lt;{" "}
        {GREEN_MAX_SCORE.toFixed(1)}
      </div>
      <div>
        🟡 <b>AMARELO:</b> |Vel| {GREEN_MAX_SLOPE_MM_PER_PASS.toFixed(2)} a{" "}
        {YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)}, |Acel| &lt; {YELLOW_MAX_ACCEL_MM.toFixed(1)} e
        Score &lt; {YELLOW_MAX_SCORE.toFixed(1)}
      </div>
      <div>
        🔴 <b>VERMELHO:</b> |Vel| &ge; {YELLOW_MAX_SLOPE_MM_PER_PASS.toFixed(2)}, |Acel| &ge;{" "}
        {YELLOW_MAX_ACCEL_MM.toFixed(1)} ou Score &ge; {YELLOW_MAX_SCORE.toFixed(1)}
      </div>
    </div>
  );
}

