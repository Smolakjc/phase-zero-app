"use client";

import React from "react";

export interface CompensationTogglesProps {
  applyIonosphere: boolean;
  applyTroposphere: boolean;
  applySolidTides: boolean;
  applyNasaPower: boolean;
  onToggleIonosphere: (val: boolean) => void;
  onToggleTroposphere: (val: boolean) => void;
  onToggleSolidTides: (val: boolean) => void;
  onToggleNasaPower: (val: boolean) => void;
}

export function CompensationToggles({
  applyIonosphere,
  applyTroposphere,
  applySolidTides,
  applyNasaPower,
  onToggleIonosphere,
  onToggleTroposphere,
  onToggleSolidTides,
  onToggleNasaPower,
}: CompensationTogglesProps) {
  const items = [
    {
      id: "ionosphere",
      label: "1. Ionospheric Split-Spectrum Screen",
      sub: "Corrige atraso de elétrons na Banda L (~24 cm)",
      val: applyIonosphere,
      toggle: () => onToggleIonosphere(!applyIonosphere),
    },
    {
      id: "troposphere",
      label: "2. Wet & Hydrostatic Troposphere",
      sub: "Corrige atraso de nuvens, vapor e pressão",
      val: applyTroposphere,
      toggle: () => onToggleTroposphere(!applyTroposphere),
    },
    {
      id: "solid_tides",
      label: "3. Solid Earth Tides (Maré Terrestre)",
      sub: "Subtrai oscilação gravitacional (Sol/Lua)",
      val: applySolidTides,
      toggle: () => onToggleSolidTides(!applySolidTides),
    },
    {
      id: "nasa_power",
      label: "4. NASA POWER Thermo-Hydro Model",
      sub: "Subtrai dilatação térmica solar (TS/SW) e chuva",
      val: applyNasaPower,
      toggle: () => onToggleNasaPower(!applyNasaPower),
    },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="switch"
          aria-checked={item.val}
          data-testid={`toggle-${item.id}`}
          onClick={item.toggle}
          className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
            item.val
              ? "bg-slate-950/90 border-sky-500/40 hover:border-sky-400"
              : "bg-slate-950/40 border-slate-800 opacity-75 hover:opacity-100"
          }`}
        >
          <div className="pr-2">
            <div className="text-xs font-bold text-slate-100">{item.label}</div>
            <div className="text-[10px] text-slate-400">{item.sub}</div>
          </div>
          <span
            className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded transition ${
              item.val
                ? "bg-emerald-600 text-white"
                : "bg-rose-950 text-rose-300 border border-rose-800"
            }`}
          >
            {item.val ? "ON" : "OFF"}
          </span>
        </button>
      ))}
    </div>
  );
}

