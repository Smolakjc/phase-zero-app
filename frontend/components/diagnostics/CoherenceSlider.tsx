"use client";

import React from "react";

export interface CoherenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function CoherenceSlider({ value, onChange }: CoherenceSliderProps) {
  return (
    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
      <div className="flex justify-between text-xs font-mono mb-1">
        <label htmlFor="min-coherence-slider" className="text-slate-300">
          Filtro de Qualidade: Coerência Mínima (γ)
        </label>
        <span data-testid="coherence-value" className="text-sky-400 font-bold">
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
        className="w-full accent-sky-400 cursor-pointer"
      />
    </div>
  );
}

