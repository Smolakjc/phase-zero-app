"use client";

import React from "react";

export interface CoherenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function CoherenceSlider({ value, onChange }: CoherenceSliderProps) {
  return (
    <div className="p-3 rounded-md bg-[#080b0f] border border-[#222933] space-y-2">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor="min-coherence-slider" className="text-[#cbd5e1] font-medium">
          Coerência Mínima (γ)
        </label>
        <span
          data-testid="coherence-value"
          className="font-mono tabular-nums text-[#3b9eeb] font-semibold"
        >
          {value.toFixed(2)}
        </span>
      </div>
      <input
        id="min-coherence-slider"
        data-testid="coherence-slider"
        type="range"
        min={0.1}
        max={0.9}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="pz-range w-full"
      />
      <p className="text-[11px] text-[#8a96a8]">
        Blocos com coerência abaixo deste limiar ficam mascarados na malha.
      </p>
    </div>
  );
}
