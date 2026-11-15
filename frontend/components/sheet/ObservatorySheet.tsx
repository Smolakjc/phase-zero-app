"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnalysisRequest, AnalysisResponse, GridPixel } from "@phase-zero/shared";
import type { ResolvedTheme } from "../../hooks/useTheme";
import { stripDecorativeEmojis } from "../../lib/colors";
import { DataSourceBadges } from "../badges/DataSourceBadges";
import { ThermoLoopChart } from "../charts/ThermoLoopChart";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { AppeearsThermoPluvioPanel } from "../diagnostics/AppeearsThermoPluvioPanel";
import { DiagnosticsPanel } from "../diagnostics/DiagnosticsPanel";
import { ChevronLeftIcon, MapPinIcon } from "../icons/SurveyIcons";
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

type MobileSheetTab = "diagnostics" | "terrain" | "charts" | "hydrothermal";

export function ObservatorySheet({
  data,
  params,
  selectedPixel,
  isFreePoint,
  loading: _loading,
  minCoherenceDraft,
  resolvedTheme,
  onSetParam,
  onSetMinCoherenceDraft,
  onUpdatePeriod: _onUpdatePeriod,
  onSelectPixel,
  onClose,
}: ObservatorySheetProps) {
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileSheetTab>("diagnostics");

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
                aria-label="Seções de análise do local"
                className="lg:hidden inline-flex items-center rounded-full p-0.5 bg-[var(--pz-well)] border border-[var(--pz-border)]"
              >
                {(
                  [
                    { id: "diagnostics", label: "Diagnóstico" },
                    { id: "terrain", label: "Malha 3D" },
                    { id: "charts", label: "Séries" },
                    { id: "hydrothermal", label: "Choque" },
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5">
          {!data || !selectedPixel ? (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--pz-accent)] border-t-transparent animate-spin" />
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold text-[var(--pz-text)]">
                  Processando interferometria NISAR e dados NASA POWER...
                </h3>
                <p className="text-[11px] text-[var(--pz-muted)] max-w-sm">
                  Consultando séries históricas e correções físicas operacionais.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Painel Executivo Enxuto de Choque Térmico (AppEEARS / MODIS LST) */}
              {data.appeears_thermo_pluvio && (
                <div className={`transition-all ${mobileTab === "hydrothermal" ? "block" : "hidden lg:block"}`}>
                  <AppeearsThermoPluvioPanel
                    analysis={data.appeears_thermo_pluvio}
                  />
                </div>
              )}

              {/* Grid 12 Colunas Workstation InSAR */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                <div
                  className={`lg:col-span-4 xl:col-span-3 ${
                    mobileTab === "diagnostics" ? "block" : "hidden lg:block"
                  }`}
                >
                  <DiagnosticsPanel
                    status={data.status}
                    appeears={data.appeears_thermo_pluvio}
                    params={params}
                    minCoherenceDraft={minCoherenceDraft}
                    onSetParam={onSetParam}
                    onSetMinCoherenceDraft={onSetMinCoherenceDraft}
                  />
                </div>

                <div
                  className={`lg:col-span-8 xl:col-span-5 ${
                    mobileTab === "terrain" ? "block" : "hidden lg:block"
                  }`}
                >
                  <TerrainViewport3D
                    meta={data.scenario_meta}
                    pixels={data.grid_pixels}
                    selectedPixel={selectedPixel}
                    resolvedTheme={resolvedTheme}
                    onSelectPixel={onSelectPixel}
                  />
                </div>

                <div
                  className={`lg:col-span-12 xl:col-span-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-3.5 ${
                    mobileTab === "charts" ? "grid" : "hidden lg:grid"
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
              </div>

              <footer className="pt-2.5 border-t border-[var(--pz-border)] text-center text-[10px] text-[var(--pz-muted)] leading-relaxed">
                Satellite InSAR is a broad-area monitoring and triage layer, not a standalone
                structural safety system. Uses NISAR Provisional Data.
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
