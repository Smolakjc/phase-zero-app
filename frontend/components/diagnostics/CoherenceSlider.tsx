"use client";

import React from "react";

export interface CoherenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function CoherenceSlider({ value, onChange }: CoherenceSliderProps) {
  return (
    <div className="p-2.5 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor="min-coherence-slider" className="text-[var(--pz-secondary)] font-medium text-[11px]">
          Coerência Mínima (γ)
        </label>
        <span
          data-testid="coherence-value"
          className="font-mono tabular-nums text-[var(--pz-accent)] font-bold text-xs"
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
      <p className="text-[10px] text-[var(--pz-muted)]">
        Blocos com γ abaixo deste limiar são mascarados na malha.
      </p>
    </div>
  );
}
