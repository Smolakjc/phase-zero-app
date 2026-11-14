"use client";

import React, { useEffect, useState } from "react";
import { AnalysisRequest, AnalysisResponse, GridPixel } from "@phase-zero/shared";
import type { ResolvedTheme } from "../../hooks/useTheme";
import { stripDecorativeEmojis } from "../../lib/colors";
import { DataSourceBadges } from "../badges/DataSourceBadges";
import { ThermoLoopChart } from "../charts/ThermoLoopChart";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import { DiagnosticsPanel } from "../diagnostics/DiagnosticsPanel";
import {
  CloseIcon,
  MapPinIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshIcon,
} from "../icons/SurveyIcons";
import { TerrainViewport3D } from "../viewport/TerrainViewport3D";

export interface ObservatorySheetProps {
  data: AnalysisResponse;
  params: AnalysisRequest;
  selectedPixel: GridPixel;
  isFreePoint: boolean;
  loading: boolean;
  minCoherenceDraft: number;
  resolvedTheme: ResolvedTheme;
  onSetParam: <K extends keyof AnalysisRequest>(
    key: K,
    value: AnalysisRequest[K],
  ) => void;
  onSetMinCoherenceDraft: (val: number) => void;
  onUpdatePeriod: (start: string, end: string) => void;
  onSelectPixel: (px: GridPixel) => void;
  onClose: () => void;
}

type MobileSheetTab = "diagnostics" | "terrain" | "charts";

export function ObservatorySheet({
  data,
  params,
  selectedPixel,
  isFreePoint,
  loading,
  minCoherenceDraft,
  resolvedTheme,
  onSetParam,
  onSetMinCoherenceDraft,
  onUpdatePeriod,
  onSelectPixel,
  onClose,
}: ObservatorySheetProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileSheetTab>("diagnostics");
  const [startDraft, setStartDraft] = useState<string>(params.start_date);
  const [endDraft, setEndDraft] = useState<string>(params.end_date);

  useEffect(() => {
    setStartDraft(params.start_date);
    setEndDraft(params.end_date);
  }, [params.start_date, params.end_date]);

  const cleanLocationName = stripDecorativeEmojis(data.scenario_meta.name);
  const periodValid = Boolean(startDraft && endDraft && startDraft < endDraft);

  const handlePeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodValid) return;
    onUpdatePeriod(startDraft, endDraft);
  };

  return (
    <section
      data-testid="observatory-sheet"
      aria-label={`Análise interferométrica de ${cleanLocationName}`}
      className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-20 mx-auto max-w-[1440px] pointer-events-auto"
    >
      <div
        className={`pz-glass-strong pz-sheet-reveal rounded-3xl flex flex-col overflow-hidden ${
          expanded ? "max-h-[82vh]" : "max-h-[56vh]"
        }`}
      >
        {/* Barra superior da folha de detalhes */}
        <header className="px-4 sm:px-5 pt-2.5 pb-3 border-b border-[var(--pz-border)] flex flex-col gap-2.5 shrink-0">
          <div className="flex justify-center" aria-hidden="true">
            <span className="w-10 h-1 rounded-full bg-[var(--pz-border-strong)]" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="mt-0.5 w-8 h-8 rounded-xl bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] flex items-center justify-center shrink-0">
                <MapPinIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    data-testid="sheet-location-title"
                    className="text-base sm:text-lg font-bold tracking-tight text-[var(--pz-text)] truncate"
                  >
                    {cleanLocationName}
                  </h2>
                  {isFreePoint && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--pz-accent-soft)] text-[var(--pz-accent)]">
                      Ponto livre no mapa
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono tabular-nums text-[var(--pz-muted)] mt-0.5">
                  Lat {data.scenario_meta.lat.toFixed(4)}° · Lon{" "}
                  {data.scenario_meta.lon.toFixed(4)}° · Incidência{" "}
                  {data.scenario_meta.los_vector.incidenceAngle}°
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form
                onSubmit={handlePeriodSubmit}
                className="flex flex-wrap items-center gap-1.5 bg-[var(--pz-well)] border border-[var(--pz-border)] rounded-full px-2.5 py-1 text-xs"
              >
                <label className="inline-flex items-center gap-1 text-[var(--pz-muted)]">
                  <span>De</span>
                  <input
                    type="date"
                    aria-label="Início da janela temporal"
                    value={startDraft}
                    onChange={(e) => setStartDraft(e.target.value)}
                    className="bg-transparent font-mono tabular-nums text-[11px] text-[var(--pz-text)] focus:outline-none"
                  />
                </label>
                <span className="text-[var(--pz-border-strong)]" aria-hidden="true">
                  /
                </span>
                <label className="inline-flex items-center gap-1 text-[var(--pz-muted)]">
                  <span>Até</span>
                  <input
                    type="date"
                    aria-label="Fim da janela temporal"
                    value={endDraft}
                    onChange={(e) => setEndDraft(e.target.value)}
                    className="bg-transparent font-mono tabular-nums text-[11px] text-[var(--pz-text)] focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!periodValid || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] disabled:opacity-40 text-[11px] font-semibold transition-opacity cursor-pointer"
                >
                  <RefreshIcon className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  <span>Atualizar</span>
                </button>
              </form>

              <button
                type="button"
                data-testid="sheet-expand-btn"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-xs font-medium text-[var(--pz-secondary)] hover:text-[var(--pz-text)] transition-colors cursor-pointer"
              >
                {expanded ? (
                  <>
                    <MinimizeIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Compactar</span>
                  </>
                ) : (
                  <>
                    <MaximizeIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Expandir</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="sheet-close-btn"
                aria-label="Fechar painel do local"
                onClick={onClose}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-[var(--pz-muted)] hover:text-[var(--pz-text)] transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <DataSourceBadges meta={data.scenario_meta} />

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
                  { id: "charts", label: "Séries & Loop" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
        </header>

        {/* Corpo rolável da folha com grade 4-em-1 em desktop */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div
              className={`lg:col-span-4 xl:col-span-3 ${
                mobileTab === "diagnostics" ? "block" : "hidden lg:block"
              }`}
            >
              <DiagnosticsPanel
                status={data.status}
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
              className={`lg:col-span-12 xl:col-span-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4 ${
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

          <footer className="pt-3 border-t border-[var(--pz-border)] text-center text-[11px] text-[var(--pz-muted)] leading-relaxed">
            Satellite InSAR is a broad-area monitoring and triage layer, not a standalone
            structural safety system. Uses NISAR Provisional Data.
          </footer>
        </div>
      </div>
    </section>
  );
}
