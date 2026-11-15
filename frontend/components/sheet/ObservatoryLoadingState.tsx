"use client";

import React, { useEffect, useState } from "react";

interface LoadingStage {
  id: string;
  chip: string;
  title: string;
  detail: string;
}

const LOADING_STAGES: readonly LoadingStage[] = [
  {
    id: "fetch",
    chip: "Dados",
    title: "Buscando dados orbitais...",
    detail: "Consultando séries temporais Sentinel-1 SAR, NISAR e catálogos NASA.",
  },
  {
    id: "analyze",
    chip: "Análises",
    title: "Fazendo análises interferométricas...",
    detail: "Processando coerência de fase, velocidade residual e aceleração LOS.",
  },
  {
    id: "correlate",
    chip: "Correlação",
    title: "Correlacionando termos geotécnicos...",
    detail: "Cruzando choque térmico, anomalias pluviométricas e limiares de risco.",
  },
  {
    id: "mesh",
    chip: "Malha 3D",
    title: "Consolidando malha topográfica...",
    detail: "Calibrando geometria da barragem e série histórica de monitoramento.",
  },
];

export interface ObservatoryLoadingStateProps {
  targetName: string;
  lat: number;
  lon: number;
  compact?: boolean;
}

export function ObservatoryLoadingState({
  targetName,
  lat,
  lon,
  compact = false,
}: ObservatoryLoadingStateProps) {
  const [stageIndex, setStageIndex] = useState<number>(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 1850);
    return () => window.clearInterval(timer);
  }, []);

  const currentStage = LOADING_STAGES[stageIndex];

  return (
    <div
      data-testid="observatory-loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`relative overflow-hidden rounded-3xl border border-[var(--pz-border)] bg-[var(--pz-surface)]/75 shadow-sm ${
        compact ? "min-h-[260px] p-5" : "min-h-[64vh] p-4 sm:p-6"
      } flex flex-col justify-between gap-6`}
    >
      {/* Fundo em grade coordenada sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 pz-radar-grid opacity-45"
      />

      {/* Esqueleto simulado dos painéis sendo inspecionados pela lupa */}
      {!compact && (
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-0 space-y-4 opacity-55 select-none"
        >
          {/* Skeleton do StatusCard */}
          <div className="pz-skeleton-shimmer rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-well)]/70 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--pz-border-strong)]/40" />
              <div className="space-y-2">
                <div className="h-3.5 w-40 sm:w-56 rounded-full bg-[var(--pz-border-strong)]/45" />
                <div className="h-2.5 w-28 sm:w-44 rounded-full bg-[var(--pz-border)]" />
              </div>
            </div>
            <div className="hidden sm:block h-7 w-28 rounded-full bg-[var(--pz-border-strong)]/35" />
          </div>

          {/* Skeleton das duas colunas (Gráficos + Pluviometria) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div className="pz-skeleton-shimmer rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-well)]/60 p-4 h-44 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="h-3 w-36 rounded-full bg-[var(--pz-border-strong)]/40" />
                  <div className="h-3 w-16 rounded-full bg-[var(--pz-border)]" />
                </div>
                <div className="flex items-end gap-2 h-24 pt-4">
                  <div className="flex-1 h-10 rounded-t-md bg-[var(--pz-border)]" />
                  <div className="flex-1 h-16 rounded-t-md bg-[var(--pz-border-strong)]/30" />
                  <div className="flex-1 h-12 rounded-t-md bg-[var(--pz-border)]" />
                  <div className="flex-1 h-20 rounded-t-md bg-[var(--pz-border-strong)]/35" />
                  <div className="flex-1 h-14 rounded-t-md bg-[var(--pz-border)]" />
                  <div className="flex-1 h-24 rounded-t-md bg-[var(--pz-accent-soft)]" />
                  <div className="flex-1 h-16 rounded-t-md bg-[var(--pz-border)]" />
                </div>
              </div>

              <div className="pz-skeleton-shimmer rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-well)]/55 p-4 h-32 flex flex-col justify-between">
                <div className="h-3 w-44 rounded-full bg-[var(--pz-border-strong)]/40" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 rounded-xl bg-[var(--pz-border)]" />
                  <div className="h-12 rounded-xl bg-[var(--pz-border)]" />
                  <div className="h-12 rounded-xl bg-[var(--pz-border)]" />
                </div>
              </div>
            </div>

            <div className="pz-skeleton-shimmer rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-well)]/60 p-4 h-44 lg:h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="h-3 w-48 rounded-full bg-[var(--pz-border-strong)]/40" />
                <div className="h-5 w-20 rounded-full bg-[var(--pz-accent-soft)]" />
              </div>
              <div className="space-y-2.5 my-auto">
                <div className="h-2.5 w-full rounded-full bg-[var(--pz-border)]" />
                <div className="h-2.5 w-5/6 rounded-full bg-[var(--pz-border-strong)]/30" />
                <div className="h-2.5 w-4/6 rounded-full bg-[var(--pz-border)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 rounded-xl bg-[var(--pz-border)]" />
                <div className="h-14 rounded-xl bg-[var(--pz-border)]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camada central com Lupa passeando pela área do menu + Card de status */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
        {/* Lupa em movimento orbital suave */}
        <div
          aria-hidden="true"
          className="pz-loupe-wander absolute flex items-center justify-center"
        >
          {/* Halo luminoso sob a lente */}
          <div className="pz-loupe-halo absolute w-36 h-36 rounded-full bg-[radial-gradient(circle,var(--pz-accent-soft)_0%,transparent_72%)] blur-md" />

          {/* Ícone vetorial detalhado de lupa geodésica */}
          <svg
            viewBox="0 0 96 96"
            fill="none"
            className="relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_10px_22px_rgba(2,132,199,0.28)]"
          >
            <defs>
              <radialGradient id="pz-lens-fill" cx="38%" cy="35%" r="65%">
                <stop offset="0%" stopColor="var(--pz-accent)" stopOpacity="0.28" />
                <stop offset="65%" stopColor="var(--pz-accent)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--pz-accent)" stopOpacity="0.03" />
              </radialGradient>
            </defs>

            {/* Cabo da lupa */}
            <path
              d="M58.5 58.5 80 80"
              stroke="var(--pz-accent)"
              strokeWidth="7.5"
              strokeLinecap="round"
            />
            <path
              d="M60 60 79 79"
              stroke="var(--pz-text)"
              strokeOpacity="0.22"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Lente */}
            <circle
              cx="40"
              cy="40"
              r="24"
              fill="url(#pz-lens-fill)"
              stroke="var(--pz-accent)"
              strokeWidth="3.5"
            />

            {/* Anel interno de mira */}
            <circle
              cx="40"
              cy="40"
              r="16"
              stroke="var(--pz-accent)"
              strokeOpacity="0.38"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />

            {/* Retículo de correlação no centro da lupa */}
            <path
              d="M40 31v18M31 40h18"
              stroke="var(--pz-accent)"
              strokeOpacity="0.7"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="40" cy="40" r="2.2" fill="var(--pz-accent)" />

            {/* Reflexo vítreo na lente */}
            <path
              d="M25 32a17 17 0 0 1 13-10"
              stroke="white"
              strokeOpacity="0.65"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Cápsula central de progresso e mensagens dinâmicas */}
        <div className="pz-glass-strong relative z-20 w-full max-w-md rounded-2xl border border-[var(--pz-border-strong)] p-5 shadow-xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--pz-accent-soft)] border border-[var(--pz-accent)]/25 text-[11px] font-semibold text-[var(--pz-accent)] max-w-full">
            <span className="w-2 h-2 rounded-full bg-[var(--pz-accent)] animate-pulse shrink-0" />
            <span className="truncate">{targetName}</span>
            <span className="font-mono text-[10px] opacity-80 shrink-0">
              {lat.toFixed(2)}°, {lon.toFixed(2)}°
            </span>
          </div>

          <div key={currentStage.id} className="pz-phrase-enter space-y-1.5 min-h-[54px]">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-[var(--pz-text)]">
              {currentStage.title}
            </h3>
            <p className="text-xs text-[var(--pz-muted)] leading-relaxed">
              {currentStage.detail}
            </p>
          </div>

          {/* Barra de progresso indeterminada */}
          <div
            role="progressbar"
            aria-label="Progresso da análise orbital"
            className="pz-loading-track h-1.5 w-full"
          >
            <div className="pz-loading-runner" />
          </div>

          {/* Etapas visuais de processamento */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
            {LOADING_STAGES.map((stage, idx) => {
              const isActive = idx === stageIndex;
              return (
                <span
                  key={stage.id}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors duration-300 ${
                    isActive
                      ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] border-transparent shadow-xs"
                      : "bg-[var(--pz-well)] text-[var(--pz-muted)] border-[var(--pz-border)]"
                  }`}
                >
                  {stage.chip}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
