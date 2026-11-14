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
      label: "Ionospheric Split-Spectrum",
      sub: "Corrige atraso dispersivo na Banda L (~24 cm)",
      val: applyIonosphere,
      toggle: () => onToggleIonosphere(!applyIonosphere),
    },
    {
      id: "troposphere",
      label: "Wet & Hydrostatic Troposphere",
      sub: "Corrige atraso de vapor d'água e pressão",
      val: applyTroposphere,
      toggle: () => onToggleTroposphere(!applyTroposphere),
    },
    {
      id: "solid_tides",
      label: "Solid Earth Tides",
      sub: "Subtrai maré terrestre gravitacional (Sol/Lua)",
      val: applySolidTides,
      toggle: () => onToggleSolidTides(!applySolidTides),
    },
    {
      id: "nasa_power",
      label: "NASA POWER Thermo-Hydro",
      sub: "Subtrai dilatação térmica (TS/SW) e precipitação",
      val: applyNasaPower,
      toggle: () => onToggleNasaPower(!applyNasaPower),
    },
  ];

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="switch"
          aria-checked={item.val}
          data-testid={`toggle-${item.id}`}
          onClick={item.toggle}
          className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
            item.val
              ? "bg-[var(--pz-surface)] border-[var(--pz-border-strong)] hover:border-[var(--pz-accent)]"
              : "bg-[var(--pz-well)] border-[var(--pz-border)] opacity-75 hover:opacity-100"
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--pz-text)]">{item.label}</div>
            <div className="text-[11px] text-[var(--pz-muted)] mt-0.5">{item.sub}</div>
          </div>

          <span className="inline-flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] font-medium ${
                item.val ? "text-[var(--pz-ok-ink)]" : "text-[var(--pz-muted)]"
              }`}
            >
              {item.val ? "Ativo" : "Inativo"}
            </span>
            <span
              aria-hidden="true"
              className={`relative inline-flex w-8 h-[18px] items-center rounded-full transition-colors p-0.5 border ${
                item.val
                  ? "bg-[var(--pz-accent-soft)] border-[var(--pz-accent)]"
                  : "bg-[var(--pz-well)] border-[var(--pz-border-strong)]"
              }`}
            >
              <span
                className={`block w-3 h-3 rounded-full transition-transform ${
                  item.val
                    ? "translate-x-3.5 bg-[var(--pz-accent)]"
                    : "translate-x-0 bg-[var(--pz-muted)]"
                }`}
              />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
