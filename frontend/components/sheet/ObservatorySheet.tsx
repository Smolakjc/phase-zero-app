"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnalysisRequest, AnalysisResponse, GridPixel } from "@phase-zero/shared";
import type { ResolvedTheme } from "../../hooks/useTheme";
import { stripDecorativeEmojis } from "../../lib/colors";
import { DataSourceBadges } from "../badges/DataSourceBadges";
import { ThermoLoopChart } from "../charts/ThermoLoopChart";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { AppeearsThermoPluvioPanel } from "../diagnostics/AppeearsThermoPluvioPanel";
import { MetricsGrid } from "../diagnostics/MetricsGrid";
import { StatusCard } from "../diagnostics/StatusCard";
import { ThresholdLegend } from "../diagnostics/ThresholdLegend";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  LayersIcon,
  MapPinIcon,
  MountainIcon,
} from "../icons/SurveyIcons";
import { TerrainViewport3D } from "../viewport/TerrainViewport3D";

export interface ObservatorySheetProps {
  data: AnalysisResponse | null;
  params: AnalysisRequest;
  selectedPixel: GridPixel | null;
  isFreePoint: boolean;
  loading: boolean;
  minCoherenceDraft: number;
  resolvedTheme: ResolvedTheme;
  onSetParam: <K extends keyof AnalysisRequest>(
    key: K,
    value: AnalysisRequest[K],
  ) => void;
  onSetMinCoherenceDraft: (val: number) => void;
  onUpdatePeriod?: (start: string, end: string) => void;
  onSelectPixel: (px: GridPixel) => void;
  onClose: () => void;
}

type MobileSheetTab = "all" | "charts" | "hydrothermal";

export function ObservatorySheet({
  data,
  params,
  selectedPixel,
  isFreePoint,
  loading: _loading,
  minCoherenceDraft: _minCoherenceDraft,
  resolvedTheme,
  onSetParam: _onSetParam,
  onSetMinCoherenceDraft: _onSetMinCoherenceDraft,
  onUpdatePeriod: _onUpdatePeriod,
  onSelectPixel,
  onClose,
}: ObservatorySheetProps) {
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileSheetTab>("all");

  // Dropdowns recolhidos no final do menu para detalhamento avançado
  const [metricsExpanded, setMetricsExpanded] = useState<boolean>(false);
  const [terrainExpanded, setTerrainExpanded] = useState<boolean>(false);

  // Gatilho da animação suave da esquerda para a direita logo após o mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const timer = setTimeout(() => {
      onClose();
    }, 320);
    return () => clearTimeout(timer);
  }, [isClosing, onClose]);

  // Tecla Escape para recolher o menu suavemente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const rawTitle = data
    ? stripDecorativeEmojis(data.scenario_meta.name)
    : params.custom_name || "Busca Live NASA";
  const cleanLocationName = rawTitle;

  const yearsList = data?.appeears_thermo_pluvio?.five_year_baseline.years_analyzed ?? [];
  const yearsCount = yearsList.length > 0 ? yearsList.length : 15;
  const firstYear = yearsList[0] ?? data?.dates[0]?.slice(0, 4) ?? "2011";
  const lastYear = yearsList[yearsList.length - 1] ?? data?.dates[data.dates.length - 1]?.slice(0, 4) ?? "2026";

  const isOffscreen = !isMounted || isClosing;

  return (
    <>
      {/* Menu completo que desliza da ESQUERDA para a DIREITA e deixa 25px à direita */}
      <section
        data-testid="observatory-sheet"
        aria-label={`Análise interferométrica de ${cleanLocationName}`}
        className={`pz-drawer-left flex flex-col pz-glass-strong border-r border-[var(--pz-border-strong)] transition-transform duration-300 ease-out pointer-events-auto ${
          isOffscreen ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Barra superior do menu com botão de recolher no topo à direita */}
        <header className="px-3.5 sm:px-5 py-3 border-b border-[var(--pz-border)] flex flex-col gap-2 shrink-0 bg-[var(--pz-surface)]/70 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] flex items-center justify-center shrink-0">
                <MapPinIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    data-testid="sheet-location-title"
                    className="text-sm sm:text-base font-bold tracking-tight text-[var(--pz-text)] truncate"
                  >
                    {cleanLocationName}
                  </h2>
                  {isFreePoint && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] border border-[var(--pz-accent)]/30">
                      Ponto Livre
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono tabular-nums text-[var(--pz-muted)] leading-tight">
                  Lat {(data?.scenario_meta.lat ?? params.custom_lat ?? 0).toFixed(4)}° · Lon{" "}
                  {(data?.scenario_meta.lon ?? params.custom_lon ?? 0).toFixed(4)}°
                  {data?.scenario_meta.los_vector.incidenceAngle != null && (
                    <> · Incidência {data.scenario_meta.los_vector.incidenceAngle}°</>
                  )}
                </p>
              </div>
            </div>

            {/* Topo na direita: Série histórica e Botão de Recolher */}
            <div className="flex items-center gap-2 shrink-0">
              {data && (
                <div
                  data-testid="fifteen-year-range-indicator"
                  className="hidden md:flex items-center gap-1.5 bg-[var(--pz-well)] border border-[var(--pz-border)] rounded-full px-2.5 py-1 text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--pz-accent)]" aria-hidden="true" />
                  <span className="font-semibold text-[var(--pz-text)]">
                    {yearsCount} Anos
                  </span>
                  <span className="font-mono tabular-nums text-[var(--pz-muted)]">
                    ({firstYear}–{lastYear})
                  </span>
                </div>
              )}

              {/* Botão de recolher no topo na direita com animação saindo e voltando pro mapa */}
              <button
                type="button"
                data-testid="sheet-close-btn"
                aria-label="Recolher menu e voltar ao mapa"
                title="Recolher menu e voltar ao mapa"
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--pz-accent)] hover:opacity-90 active:scale-95 text-[var(--pz-accent-ink)] text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Recolher</span>
              </button>
            </div>
          </div>

          {data && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--pz-border)]/60">
              <DataSourceBadges
                meta={data.scenario_meta}
                appeears={data.appeears_thermo_pluvio}
              />

              {/* Navegação por abas em telas menores que lg */}
              <div
                role="tablist"
                aria-label="Filtro de visualização do painel"
                className="lg:hidden inline-flex items-center rounded-full p-0.5 bg-[var(--pz-well)] border border-[var(--pz-border)]"
              >
                {(
                  [
                    { id: "all", label: "Tudo" },
                    { id: "charts", label: "Séries & Loop" },
                    { id: "hydrothermal", label: "Pluviometria" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === tab.id}
                    onClick={() => setMobileTab(tab.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      mobileTab === tab.id
                        ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                        : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Corpo rolável do menu */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4">
          {!data || !selectedPixel ? (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--pz-accent)] border-t-transparent animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-[var(--pz-text)]">
                  Sincronizando telemetria orbital...
                </h3>
                <p className="text-xs text-[var(--pz-muted)] max-w-sm">
                  Recuperando séries temporais InSAR e dados hidroclimáticos.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Diagnóstico Geral do Alvo: StatusCard direto e limpo */}
              <StatusCard status={data.status} appeears={data.appeears_thermo_pluvio} />

              {/* 2. Monitoramento Central: Duas Frentes lado a lado (Séries/Loop Térmico + Índices Pluviométricos) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Lado Esquerdo: Deconvolução Temporal + Loop Termo-Mecânico */}
                <div
                  className={`flex flex-col gap-3.5 ${
                    mobileTab === "hydrothermal" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <TimeSeriesChart
                    dates={data.dates}
                    pixel={selectedPixel}
                    statusCode={data.status.code}
                  />
                  <ThermoLoopChart
                    pixel={selectedPixel}
                    residualTrendMmPerPass={data.status.residual_trend_mm_per_pass}
                  />
                </div>

                {/* Lado Direito: Situação dos Índices Pluviométricos & Choque Térmico (ABERTO E VISÍVEL) */}
                {data.appeears_thermo_pluvio && (
                  <div
                    className={`${
                      mobileTab === "charts" ? "hidden lg:block" : "block"
                    }`}
                  >
                    <AppeearsThermoPluvioPanel
                      analysis={data.appeears_thermo_pluvio}
                    />
                  </div>
                )}
              </div>

              {/* 3. Detalhamento Técnico Avançado no Final do Menu (Ocultos em Dropdowns) */}
              <div className="pt-2 border-t border-[var(--pz-border)] space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--pz-secondary)] uppercase tracking-wider">
                    Detalhamento Técnico Avançado
                  </span>
                  <span className="text-[11px] text-[var(--pz-muted)]">
                    Clique para detalhar
                  </span>
                </div>

                {/* Dropdown 1: Métricas Decisórias InSAR */}
                <div className="rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-surface)] overflow-hidden transition-all shadow-sm">
                  <button
                    type="button"
                    aria-expanded={metricsExpanded}
                    onClick={() => setMetricsExpanded((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--pz-well)]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[var(--pz-well)] text-[var(--pz-accent)] flex items-center justify-center shrink-0 border border-[var(--pz-border)]">
                        <LayersIcon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[var(--pz-text)]">
                            Métricas Decisórias & Limiares InSAR
                          </span>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-[var(--pz-muted)] truncate block">
                          Velocidade: {data.status.residual_trend_mm_per_pass} mm/c · Aceleração: {data.status.acceleration_index_mm} mm · Score: {data.status.max_weighted_anomaly_score}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--pz-well)] text-[var(--pz-secondary)] border border-[var(--pz-border)]">
                        {metricsExpanded ? "Ocultar" : "Ver Detalhes"}
                      </span>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-[var(--pz-muted)] transition-transform duration-200 ${
                          metricsExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {metricsExpanded && (
                    <div className="p-4 border-t border-[var(--pz-border)] space-y-3 bg-[var(--pz-well)]/30">
                      <div className="text-[11px] font-semibold text-[var(--pz-secondary)]">
                        Valores Estatísticos Calculados
                      </div>
                      <MetricsGrid status={data.status} />
                      <ThresholdLegend />
                    </div>
                  )}
                </div>

                {/* Dropdown 2: Malha Topográfica 3D */}
                <div className="rounded-2xl border border-[var(--pz-border)] bg-[var(--pz-surface)] overflow-hidden transition-all shadow-sm">
                  <button
                    type="button"
                    aria-expanded={terrainExpanded}
                    onClick={() => setTerrainExpanded((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--pz-well)]/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[var(--pz-well)] text-[var(--pz-accent)] flex items-center justify-center shrink-0 border border-[var(--pz-border)]">
                        <MountainIcon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[var(--pz-text)]">
                            Malha Topográfica 3D & Relevo
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--pz-muted)] truncate block">
                          Visualização tridimensional da geometria da barragem ({data.grid_pixels.length} nós)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--pz-well)] text-[var(--pz-secondary)] border border-[var(--pz-border)]">
                        {terrainExpanded ? "Ocultar" : "Abrir Malha 3D"}
                      </span>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-[var(--pz-muted)] transition-transform duration-200 ${
                          terrainExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {terrainExpanded && (
                    <div className="p-4 border-t border-[var(--pz-border)] bg-[var(--pz-well)]/20">
                      <TerrainViewport3D
                        meta={data.scenario_meta}
                        pixels={data.grid_pixels}
                        selectedPixel={selectedPixel}
                        resolvedTheme={resolvedTheme}
                        onSelectPixel={onSelectPixel}
                      />
                    </div>
                  )}
                </div>
              </div>

              <footer className="pt-3 border-t border-[var(--pz-border)] text-center text-[11px] text-[var(--pz-muted)] flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <span>NISAR Provisional · Sentinel-1 SAR</span>
                <span className="hidden sm:inline opacity-40" aria-hidden="true">·</span>
                <span>NASA POWER & AppEEARS</span>
                <span className="hidden sm:inline opacity-40" aria-hidden="true">·</span>
                <span>Triagem Geotécnica Orbital</span>
              </footer>
            </>
          )}
        </div>
      </section>

      {/* Espaço de 25px visível na direita onde o mapa continua acessível */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Recolher menu e voltar ao mapa"
        title="Clique para recolher o menu e voltar ao mapa"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClose();
        }}
        className={`fixed top-0 right-0 w-[25px] h-full z-40 cursor-pointer pointer-events-auto transition-opacity duration-300 ${
          isOffscreen
            ? "opacity-0 pointer-events-none"
            : "opacity-100 bg-black/5 hover:bg-black/20 dark:bg-black/10 dark:hover:bg-black/30"
        }`}
      />
    </>
  );
}
