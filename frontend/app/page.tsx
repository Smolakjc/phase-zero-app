"use client";

import React, { useState } from "react";
import { FloatingHud } from "../components/hud/FloatingHud";
import { AlertTriangleIcon, CrosshairIcon } from "../components/icons/SurveyIcons";
import { MapStyleMode, ObservatoryMap } from "../components/map/ObservatoryMap";
import { ObservatorySheet } from "../components/sheet/ObservatorySheet";
import { AnalysisProvider, useAnalysis } from "../hooks/useAnalysis";
import { useTheme } from "../hooks/useTheme";

function ObservatoryWorkspace() {
  const {
    params,
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
    selectDam,
    selectFreePoint,
    clearSelection,
    updatePeriod,
    runCustom,
    selectPixel,
    retry,
  } = useAnalysis();

  const {
    preference: themePreference,
    resolvedTheme,
    toggleTheme,
    setPreference: setThemePreference,
  } = useTheme();

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
        hasSelection={hasSelection}
        dams={dams}
        selectedDamId={selectedDamId}
        startDate={params.start_date}
        endDate={params.end_date}
        initialLat={params.custom_lat ?? -19.9419}
        initialLon={params.custom_lon ?? -43.5997}
        initialName={params.custom_name ?? ""}
        loading={loading}
        revalidating={revalidating}
        themePreference={themePreference}
        resolvedTheme={resolvedTheme}
        styleMode={styleMode}
        terrain3D={terrain3D}
        onSelectDam={selectDam}
        onSearchCustom={runCustom}
        onFlyRegion={handleFlyRegion}
        onToggleTheme={toggleTheme}
        onSetThemePreference={setThemePreference}
        onChangeStyleMode={setStyleMode}
        onToggleTerrain3D={() => setTerrain3D((v) => !v)}
      />

      {/* Estado inicial limpo: convite sutil + legenda mínima no rodapé */}
      {!hasSelection && !loading && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[92vw]">
          <div
            data-testid="map-prompt-pill"
            className="pz-glass pointer-events-auto px-4 py-2 rounded-full text-xs font-medium text-[var(--pz-secondary)] flex items-center gap-2 shadow-sm animate-pulse"
          >
            <CrosshairIcon className="w-3.5 h-3.5 text-[var(--pz-accent)]" />
            <span>
              Clique em qualquer barragem ou em um ponto livre do mapa para iniciar a análise
            </span>
          </div>

          <div className="pz-glass pointer-events-auto hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full text-[11px] text-[var(--pz-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--pz-status-red)]" />
              <span>Crítica / Rompida</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--pz-status-yellow)]" />
              <span>Atenção</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--pz-status-green)]" />
              <span>Operação Normal</span>
            </span>
          </div>
        </div>
      )}

      {/* Indicador de carregamento inicial centralizado */}
      {loading && !hasSelection && (
        <div
          data-testid="initial-loading-card"
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4 bg-[var(--pz-ground)]/40 backdrop-blur-xs"
        >
          <div className="pz-glass-strong pointer-events-auto p-5 rounded-2xl max-w-sm w-full text-center space-y-3 shadow-lg">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] flex items-center justify-center">
              <CrosshairIcon className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--pz-text)]">
                Carregando Observatório InSAR
              </h2>
              <p className="text-xs text-[var(--pz-muted)] mt-1">
                Conectando ao catálogo de barragens e sincronizando topografia DEM 30m...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de erro flutuante com opção de tentar novamente */}
      {error && !loading && (
        <aside
          role="alert"
          aria-live="assertive"
          data-testid="error-banner"
          className="pointer-events-auto fixed bottom-4 right-4 z-30 max-w-md p-3.5 rounded-2xl bg-[var(--pz-well)] border border-[var(--pz-status-red)]/40 text-xs shadow-lg space-y-2"
        >
          <div className="flex items-start gap-2 text-[var(--pz-status-red)]">
            <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">Falha na Análise:</span> {error}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={retry}
              className="px-3 py-1 rounded-lg bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] font-semibold text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Tentar Novamente
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1 rounded-lg bg-[var(--pz-well)] hover:bg-[var(--pz-border)] text-[var(--pz-secondary)] text-[11px] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </aside>
      )}

      {/* Folha deslizante com análise detalhada do alvo */}
      {hasSelection && (
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
