"use client";

import React, { useState } from "react";
import { ThermoLoopChart } from "../components/charts/ThermoLoopChart";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart";
import { DiagnosticsPanel } from "../components/diagnostics/DiagnosticsPanel";
import { Header } from "../components/header/Header";
import { AlertTriangleIcon, RefreshIcon } from "../components/icons/SurveyIcons";
import { DamMapPanel } from "../components/map/DamMapPanel";
import { SearchBar } from "../components/search/SearchBar";
import { TokenModal } from "../components/token/TokenModal";
import { TerrainViewport3D } from "../components/viewport/TerrainViewport3D";
import { AnalysisProvider, useAnalysis } from "../hooks/useAnalysis";

function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0c0f14] text-[#eef2f6]">
      <div className="h-[61px] bg-[#0e1218] border-b border-[#222933]" />
      <div className="h-[53px] bg-[#0a0d12] border-b border-[#222933]" />
      <main className="max-w-[1640px] mx-auto px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[460px] rounded-lg bg-[#131820] border border-[#222933] animate-pulse" />
              <div className="h-[460px] rounded-lg bg-[#131820] border border-[#222933] animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 h-[280px] rounded-lg bg-[#131820] border border-[#222933] animate-pulse" />
              <div className="lg:col-span-5 h-[280px] rounded-lg bg-[#131820] border border-[#222933] animate-pulse" />
            </div>
          </div>
          <div className="xl:col-span-4 2xl:col-span-3 h-[756px] rounded-lg bg-[#10141b] border border-[#222933] animate-pulse" />
        </div>
      </main>
    </div>
  );
}

function PhaseZeroWorkspace() {
  const {
    params,
    scenarios,
    dams,
    selectedDamId,
    isFreePoint,
    data,
    selectedPixel,
    loading,
    revalidating,
    error,
    minCoherenceDraft,
    setParam,
    setMinCoherenceDraft,
    selectScenario,
    selectDam,
    selectFreePoint,
    updatePeriod,
    runCustom,
    selectPixel,
    saveToken,
    removeToken,
    retry,
  } = useAnalysis();

  const [showTokenModal, setShowTokenModal] = useState(false);

  if (loading && !data) {
    return <DashboardLoadingSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-md w-full bg-[#131820] border border-[#9f1239] rounded-lg p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-[#f43f5e] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-base font-bold text-[#eef2f6]">
                Não foi possível carregar a análise InSAR
              </h1>
              <p className="text-xs text-[#a1adbf] mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#3b9eeb] hover:bg-[#57aff0] text-[#08111b] text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  if (!data || !selectedPixel) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0c0f14] text-[#eef2f6] flex flex-col">
      <Header
        scenarios={scenarios}
        activeScenarioId={params.scenario_id}
        latestGranuleLabel={data.scenario_meta.asf_status?.latest_granule}
        earthdataToken={params.earthdata_token ?? ""}
        revalidating={revalidating}
        onSelectScenario={selectScenario}
        onOpenTokenModal={() => setShowTokenModal(true)}
      />

      <SearchBar
        startDate={params.start_date}
        endDate={params.end_date}
        initialLat={params.custom_lat ?? data.scenario_meta.lat}
        initialLon={params.custom_lon ?? data.scenario_meta.lon}
        initialName={params.custom_name ?? data.scenario_meta.name}
        loading={loading || revalidating}
        meta={data.scenario_meta}
        onUpdatePeriod={updatePeriod}
        onSearchCustom={runCustom}
      />

      <main className="flex-1 w-full max-w-[1640px] mx-auto px-4 lg:px-6 py-4 space-y-4">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-[#230f16] border border-[#9f1239] text-xs text-[#fecdd3]"
          >
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-[#f43f5e] shrink-0" />
              <span>Falha ao atualizar a análise: {error}</span>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131820] hover:bg-[#1a222d] border border-[#9f1239] text-[#eef2f6] font-semibold cursor-pointer"
            >
              <RefreshIcon className="w-3 h-3" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className="xl:col-span-8 2xl:col-span-9 space-y-4 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <DamMapPanel
                dams={dams}
                selectedDamId={selectedDamId}
                activeLat={params.custom_lat ?? data.scenario_meta.lat}
                activeLon={params.custom_lon ?? data.scenario_meta.lon}
                isFreePoint={isFreePoint}
                loading={loading || revalidating}
                onSelectDam={selectDam}
                onSelectFreePoint={selectFreePoint}
              />

              <TerrainViewport3D
                meta={data.scenario_meta}
                pixels={data.grid_pixels}
                selectedPixel={selectedPixel}
                onSelectPixel={selectPixel}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

          <div className="xl:col-span-4 2xl:col-span-3 order-first xl:order-last xl:sticky xl:top-4">
            <DiagnosticsPanel
              status={data.status}
              params={params}
              minCoherenceDraft={minCoherenceDraft}
              onSetParam={setParam}
              onSetMinCoherenceDraft={setMinCoherenceDraft}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-[1640px] w-full mx-auto px-4 lg:px-6 pb-5 pt-2">
        <div className="border-t border-[#222933] pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#8a96a8]">
          <p>{data.disclaimer}</p>
          <span className="font-mono text-[#cbd5e1] shrink-0">
            PHASE-ZERO v5.0 · NASA Space Apps Challenge
          </span>
        </div>
      </footer>

      <TokenModal
        open={showTokenModal}
        initialToken={params.earthdata_token ?? ""}
        onSave={saveToken}
        onRemove={removeToken}
        onClose={() => setShowTokenModal(false)}
      />
    </div>
  );
}

export default function PhaseZeroDashboard() {
  return (
    <AnalysisProvider>
      <PhaseZeroWorkspace />
    </AnalysisProvider>
  );
}
