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
      label: "Ionosphere Split-Spectrum",
      sub: "Atraso dispersivo Banda L (~24 cm)",
      val: applyIonosphere,
      toggle: () => onToggleIonosphere(!applyIonosphere),
    },
    {
      id: "troposphere",
      label: "Troposphere Wet & Hydro",
      sub: "Atraso de vapor d'água e pressão",
      val: applyTroposphere,
      toggle: () => onToggleTroposphere(!applyTroposphere),
    },
    {
      id: "solid_tides",
      label: "Solid Earth Tides",
      sub: "Maré gravitacional da crosta",
      val: applySolidTides,
      toggle: () => onToggleSolidTides(!applySolidTides),
    },
    {
      id: "nasa_power",
      label: "NASA POWER Thermo-Hydro",
      sub: "Dilatação térmica TS e precipitação",
      val: applyNasaPower,
      toggle: () => onToggleNasaPower(!applyNasaPower),
    },
  ];

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="switch"
          aria-checked={item.val}
          data-testid={`toggle-${item.id}`}
          onClick={item.toggle}
          className={`w-full text-left flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
            item.val
              ? "bg-[var(--pz-surface)] border-[var(--pz-border-strong)] hover:border-[var(--pz-accent)]"
              : "bg-[var(--pz-well)]/60 border-[var(--pz-border)] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--pz-text)] leading-tight">
              {item.label}
            </div>
            <div className="text-[10px] text-[var(--pz-muted)] truncate mt-0.5">
              {item.sub}
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[10px] font-medium ${
                item.val ? "text-[var(--pz-ok-ink)]" : "text-[var(--pz-muted)]"
              }`}
            >
              {item.val ? "Ativo" : "Off"}
            </span>
            <span
              aria-hidden="true"
              className={`relative inline-flex w-7 h-4 items-center rounded-full transition-colors p-0.5 border ${
                item.val
                  ? "bg-[var(--pz-accent-soft)] border-[var(--pz-accent)]"
                  : "bg-[var(--pz-well)] border-[var(--pz-border-strong)]"
              }`}
            >
              <span
                className={`block w-2.5 h-2.5 rounded-full transition-transform ${
                  item.val
                    ? "translate-x-3 bg-[var(--pz-accent)]"
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
