"use client";

import React, { useState } from "react";
import { FloatingHud } from "../components/hud/FloatingHud";
import { AlertTriangleIcon, CrosshairIcon } from "../components/icons/SurveyIcons";
import { MapStyleMode, ObservatoryMap } from "../components/map/ObservatoryMap";
import { ObservatorySheet } from "../components/sheet/ObservatorySheet";
import { TokenModal } from "../components/token/TokenModal";
import { AnalysisProvider, useAnalysis } from "../hooks/useAnalysis";
import { useTheme } from "../hooks/useTheme";

function ObservatoryWorkspace() {
  const {
    params,
    scenarios,
    dams,
    selectedDamId,
    hasSelection,
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
    clearSelection,
    updatePeriod,
    runCustom,
    selectPixel,
    saveToken,
    removeToken,
    retry,
  } = useAnalysis();

  const {
    preference: themePreference,
    resolvedTheme,
    toggleTheme,
    setPreference: setThemePreference,
  } = useTheme();

  const [tokenModalOpen, setTokenModalOpen] = useState<boolean>(false);
  const [styleMode, setStyleMode] = useState<MapStyleMode>("vector");
  const [terrain3D, setTerrain3D] = useState<boolean>(false);
  const [regionFlyTarget, setRegionFlyTarget] = useState<{
    center: [number, number];
    zoom: number;
    nonce: number;
  } | null>(null);

  const handleFlyRegion = (center: [number, number], zoom: number) => {
    setRegionFlyTarget({ center, zoom, nonce: Date.now() });
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[var(--pz-ground)] text-[var(--pz-text)]">
      {/* Mapa em tela cheia */}
      <div className="absolute inset-0 z-0">
        <ObservatoryMap
          dams={dams}
          selectedDamId={selectedDamId}
          hasSelection={hasSelection}
          activeLat={data?.scenario_meta.lat ?? params.custom_lat ?? -19.9419}
          activeLon={data?.scenario_meta.lon ?? params.custom_lon ?? -43.5997}
          isFreePoint={isFreePoint}
          resolvedTheme={resolvedTheme}
          styleMode={styleMode}
          terrain3D={terrain3D}
          regionFlyTarget={regionFlyTarget}
          onSelectDam={selectDam}
          onSelectFreePoint={selectFreePoint}
        />
      </div>

      {/* HUD flutuante superior */}
      <FloatingHud
        scenarios={scenarios}
        activeScenarioId={params.scenario_id}
        hasSelection={hasSelection}
        dams={dams}
        selectedDamId={selectedDamId}
        startDate={params.start_date}
        endDate={params.end_date}
        initialLat={params.custom_lat ?? -19.9419}
        initialLon={params.custom_lon ?? -43.5997}
        initialName={params.custom_name ?? ""}
        earthdataToken={params.earthdata_token ?? ""}
        loading={loading}
        revalidating={revalidating}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        styleMode={styleMode}
        terrain3D={terrain3D}
        onSelectScenario={selectScenario}
        onSelectDam={selectDam}
        onSearchCustom={runCustom}
        onFlyRegion={handleFlyRegion}
        onToggleTheme={toggleTheme}
        onSetThemePreference={setThemePreference}
        onChangeStyleMode={setStyleMode}
        onToggleTerrain3D={() => setTerrain3D((v) => !v)}
        onOpenTokenModal={() => setTokenModalOpen(true)}
      />

      {/* Estado inicial limpo: convite sutil + legenda mínima no rodapé */}
      {!hasSelection && (
        <div className="pointer-events-none fixed bottom-[76px] sm:bottom-5 left-3 right-16 sm:left-4 sm:right-4 z-10 flex justify-center">
          <div
            data-testid="map-prompt-pill"
            className="pointer-events-auto pz-glass pz-sheet-reveal px-4 py-2.5 rounded-full flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-[var(--pz-secondary)] max-w-[94vw]"
          >
            <span className="inline-flex items-center gap-2 font-medium text-[var(--pz-text)]">
              <CrosshairIcon className="w-3.5 h-3.5 text-[var(--pz-accent)] shrink-0" />
              <span>
                Clique em qualquer ponto ou marcador do mapa para inspecionar a série InSAR
              </span>
            </span>
            <span
              className="hidden sm:inline-flex items-center gap-3 pl-3 border-l border-[var(--pz-border)] text-[11px] text-[var(--pz-muted)]"
              aria-hidden="true"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                Estável
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                Atenção
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                Crítico
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Carregando primeiro alvo selecionado */}
      {hasSelection && loading && !data && (
        <div className="pointer-events-none fixed bottom-6 left-4 right-4 z-20 flex justify-center">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto pz-glass-strong pz-sheet-reveal px-5 py-3 rounded-full flex items-center gap-3 text-xs font-medium text-[var(--pz-text)]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--pz-accent)] animate-pulse" />
            <span>Processando interferometria NISAR e correções físicas...</span>
          </div>
        </div>
      )}

      {/* Erro sem dados prévios */}
      {hasSelection && error && !data && !loading && (
        <div className="pointer-events-none fixed bottom-6 left-4 right-4 z-20 flex justify-center">
          <div
            data-testid="error-alert"
            role="alert"
            className="pointer-events-auto pz-glass-strong pz-sheet-reveal px-5 py-4 rounded-2xl max-w-lg w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangleIcon className="w-4 h-4 text-[var(--pz-danger-ink)] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[var(--pz-text)]">
                  Falha ao consultar o motor InSAR
                </div>
                <div className="text-[var(--pz-muted)] mt-0.5">{error}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={retry}
                className="px-3 py-1.5 rounded-full bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] text-xs font-semibold cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-full bg-[var(--pz-well)] border border-[var(--pz-border)] text-[var(--pz-secondary)] text-xs font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erro durante revalidação com dados existentes */}
      {hasSelection && error && data && (
        <div
          data-testid="error-alert"
          role="alert"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pz-glass-strong px-4 py-2 rounded-full flex items-center gap-3 text-xs max-w-[92vw]"
        >
          <AlertTriangleIcon className="w-3.5 h-3.5 text-[var(--pz-danger-ink)] shrink-0" />
          <span className="truncate text-[var(--pz-text)]">{error}</span>
          <button
            type="button"
            onClick={retry}
            className="px-2.5 py-0.5 rounded-full bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] font-semibold shrink-0 cursor-pointer"
          >
            Repetir
          </button>
        </div>
      )}

      {/* Folha inferior do observatório (exibida apenas após selecionar um local) */}
      {hasSelection && data && selectedPixel && (
        <ObservatorySheet
          data={data}
          params={params}
          selectedPixel={selectedPixel}
          isFreePoint={isFreePoint}
          loading={loading}
          minCoherenceDraft={minCoherenceDraft}
          resolvedTheme={resolvedTheme}
          onSetParam={setParam}
          onSetMinCoherenceDraft={setMinCoherenceDraft}
          onUpdatePeriod={updatePeriod}
          onSelectPixel={selectPixel}
          onClose={clearSelection}
        />
      )}

      <TokenModal
        open={tokenModalOpen}
        initialToken={params.earthdata_token ?? ""}
        onSave={saveToken}
        onRemove={removeToken}
        onClose={() => setTokenModalOpen(false)}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <AnalysisProvider>
      <ObservatoryWorkspace />
    </AnalysisProvider>
  );
}
