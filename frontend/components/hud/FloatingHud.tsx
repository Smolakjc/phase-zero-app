"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { DamCatalogItem, DamPhysicalStatus, ScenarioItem } from "@phase-zero/shared";
import { CustomSearchInput } from "../../hooks/useAnalysis";
import { ResolvedTheme, ThemePreference } from "../../hooks/useTheme";
import { stripDecorativeEmojis } from "../../lib/colors";
import { isValidEarthdataToken } from "../../lib/tokenStorage";
import {
  AlertTriangleIcon,
  BrandMarkIcon,
  CrosshairIcon,
  KeyIcon,
  LayersIcon,
  MonitorIcon,
  MoonIcon,
  MountainIcon,
  RefreshIcon,
  SearchIcon,
  SunIcon,
} from "../icons/SurveyIcons";
import { MapStyleMode } from "../map/ObservatoryMap";

export interface FloatingHudProps {
  scenarios: readonly ScenarioItem[];
  activeScenarioId: string;
  hasSelection: boolean;
  dams: readonly DamCatalogItem[];
  selectedDamId: string | null;
  startDate: string;
  endDate: string;
  initialLat: number;
  initialLon: number;
  initialName: string;
  earthdataToken: string;
  loading: boolean;
  revalidating: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  styleMode: MapStyleMode;
  terrain3D: boolean;
  onSelectScenario: (id: string, defaultStart: string, defaultEnd: string) => void;
  onSelectDam: (dam: DamCatalogItem) => void;
  onSearchCustom: (input: CustomSearchInput) => void;
  onFlyRegion: (center: [number, number], zoom: number) => void;
  onToggleTheme: () => void;
  onSetThemePreference: (pref: ThemePreference) => void;
  onChangeStyleMode: (mode: MapStyleMode) => void;
  onToggleTerrain3D: () => void;
  onOpenTokenModal: () => void;
}

type StatusFilter = "all" | DamPhysicalStatus;

const REGION_PRESETS: readonly {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
}[] = [
  { id: "br", label: "Brasil", center: [-15.6, -47.9], zoom: 4.1 },
  { id: "mg", label: "MG", center: [-20.08, -43.78], zoom: 8.8 },
  { id: "se_co", label: "SE / CO", center: [-19.5, -48.5], zoom: 6 },
  { id: "sul", label: "Sul", center: [-27.2, -52.2], zoom: 6 },
  { id: "ne", label: "Nordeste", center: [-8.2, -38.8], zoom: 6 },
  { id: "norte", label: "Norte", center: [-4.8, -52.5], zoom: 5 },
];

const SCENARIO_SHORT_LABEL: Record<string, string> = {
  itaipu_normal: "Itaipu (PR)",
  gongo_soco_active: "Gongo Soco (MG)",
  maceio_subsidence: "Maceió (AL)",
  brumadinho_hist: "Brumadinho (MG)",
};

const SCENARIO_DOT_HEX: Record<string, string> = {
  itaipu_normal: "#10b981",
  gongo_soco_active: "#f59e0b",
  maceio_subsidence: "#f43f5e",
  brumadinho_hist: "#f43f5e",
};

export function FloatingHud({
  scenarios,
  activeScenarioId,
  hasSelection,
  dams,
  selectedDamId,
  startDate,
  endDate,
  initialLat,
  initialLon,
  initialName,
  earthdataToken,
  loading,
  revalidating,
  themePreference,
  resolvedTheme,
  styleMode,
  terrain3D,
  onSelectScenario,
  onSelectDam,
  onSearchCustom,
  onFlyRegion,
  onToggleTheme,
  onSetThemePreference,
  onChangeStyleMode,
  onToggleTerrain3D,
  onOpenTokenModal,
}: FloatingHudProps) {
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchTab, setSearchTab] = useState<"catalog" | "coords">("catalog");
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [customName, setCustomName] = useState<string>(initialName);
  const [customLat, setCustomLat] = useState<string>(String(initialLat));
  const [customLon, setCustomLon] = useState<string>(String(initialLon));
  const [sDate, setSDate] = useState<string>(startDate);
  const [eDate, setEDate] = useState<string>(endDate);

  useEffect(() => {
    setSDate(startDate);
    setEDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    setCustomLat(String(initialLat));
    setCustomLon(String(initialLon));
    setCustomName(initialName);
  }, [initialLat, initialLon, initialName]);

  useEffect(() => {
    if (!searchOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  const filteredDams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dams.filter((dam) => {
      if (statusFilter !== "all" && dam.physical_status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        dam.name.toLowerCase().includes(q) ||
        dam.location.toLowerCase().includes(q) ||
        dam.physical_status_label.toLowerCase().includes(q) ||
        dam.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  }, [dams, query, statusFilter]);

  const normLat = customLat.trim().replace(",", ".");
  const normLon = customLon.trim().replace(",", ".");
  const parsedLat = Number(normLat);
  const parsedLon = Number(normLon);
  const isDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(sDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(eDate) &&
    sDate < eDate;
  const isLatValid =
    normLat !== "" && Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90;
  const isLonValid =
    normLon !== "" && Number.isFinite(parsedLon) && parsedLon >= -180 && parsedLon <= 180;
  const canSubmitCustom = isDateValid && isLatValid && isLonValid && !loading;

  const hasValidToken = isValidEarthdataToken(earthdataToken);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitCustom) return;
    onSearchCustom({
      startDate: sDate,
      endDate: eDate,
      lat: parsedLat,
      lon: parsedLon,
      name: customName,
    });
    setSearchOpen(false);
  };

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 p-3 sm:p-4 flex flex-wrap xl:flex-nowrap items-start justify-between gap-2">
      {/* Lado Esquerdo: Marca + Busca Unificada */}
      <div
        ref={searchPanelRef}
        className="pointer-events-auto relative flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-full"
      >
        <div className="pz-glass flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0">
          <span className="w-7 h-7 rounded-full bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] flex items-center justify-center shrink-0">
            <BrandMarkIcon className="w-4 h-4" />
          </span>
          <div className="leading-tight pr-0.5">
            <h1 className="text-sm font-bold tracking-[0.02em] text-[var(--pz-text)]">
              PHASE-ZERO
            </h1>
            <p className="text-[11px] text-[var(--pz-muted)] hidden sm:block">
              Observatório InSAR
            </p>
          </div>
          {revalidating && (
            <span
              data-testid="revalidating-badge"
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] text-[11px] font-medium"
            >
              <RefreshIcon className="w-3 h-3 animate-spin" />
              <span className="hidden md:inline">Atualizando</span>
            </span>
          )}
        </div>

        <button
          type="button"
          data-testid="open-search-btn"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen((v) => !v)}
          className="pz-glass inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-medium text-[var(--pz-secondary)] hover:text-[var(--pz-text)] hover:border-[var(--pz-accent)] transition-colors cursor-pointer shrink-0"
        >
          <SearchIcon className="w-3.5 h-3.5 text-[var(--pz-accent)] shrink-0" />
          <span className="truncate max-w-[155px] sm:max-w-[165px]">
            Buscar barragem / Lat-Lon
          </span>
        </button>

        {searchOpen && (
          <div
            data-testid="search-popover"
            className="pz-glass-strong pz-popover-reveal absolute top-full left-0 mt-2 w-[min(92vw,420px)] rounded-2xl p-3.5 space-y-3 z-30"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Modo de seleção de alvo"
                className="inline-flex rounded-full p-0.5 bg-[var(--pz-well)] border border-[var(--pz-border)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={searchTab === "catalog"}
                  onClick={() => setSearchTab("catalog")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    searchTab === "catalog"
                      ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                      : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
                  }`}
                >
                  Catálogo ({dams.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="tab-custom-coords"
                  aria-selected={searchTab === "coords"}
                  onClick={() => setSearchTab("coords")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    searchTab === "coords"
                      ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                      : "text-[var(--pz-muted)] hover:text-[var(--pz-text)]"
                  }`}
                >
                  Coordenada Livre
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {REGION_PRESETS.slice(0, 4).map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      onFlyRegion(reg.center, reg.zoom);
                    }}
                    className="px-2 py-1 rounded-full bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-[11px] font-medium text-[var(--pz-secondary)] hover:text-[var(--pz-text)] transition-colors cursor-pointer"
                  >
                    {reg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:hidden space-y-1.5 pb-1 border-b border-[var(--pz-border)]">
              <div className="text-[11px] font-semibold text-[var(--pz-muted)]">
                Cenários calibrados
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((sc) => {
                  const isActive = hasSelection && activeScenarioId === sc.id;
                  const cleanLabel = stripDecorativeEmojis(sc.label);
                  const dotHex = SCENARIO_DOT_HEX[sc.id] ?? "#14b8a6";
                  return (
                    <button
                      key={`mob-${sc.id}`}
                      type="button"
                      onClick={() => {
                        onSelectScenario(sc.id, sc.default_start, sc.default_end);
                        setSearchOpen(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                          : "bg-[var(--pz-well)] border border-[var(--pz-border)] text-[var(--pz-secondary)] hover:text-[var(--pz-text)]"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isActive ? "currentColor" : dotHex }}
                        aria-hidden="true"
                      />
                      <span>{cleanLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {searchTab === "catalog" ? (
              <div className="space-y-2.5">
                <div className="relative">
                  <label htmlFor={searchInputId} className="sr-only">
                    Filtrar barragens por nome, cidade ou estado
                  </label>
                  <SearchIcon className="w-3.5 h-3.5 text-[var(--pz-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={searchInputId}
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrar por nome, município ou UF..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] text-xs text-[var(--pz-text)] placeholder:text-[var(--pz-muted)] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1" role="group" aria-label="Situação física">
                  {(
                    [
                      { id: "all", label: "Todas" },
                      { id: "standing", label: "De pé" },
                      { id: "decommissioning", label: "Descaract." },
                      { id: "collapsed", label: "Históricas" },
                    ] as const
                  ).map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      aria-pressed={statusFilter === flt.id}
                      onClick={() => setStatusFilter(flt.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        statusFilter === flt.id
                          ? "bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] border-[var(--pz-accent)]"
                          : "bg-[var(--pz-well)] text-[var(--pz-muted)] border-[var(--pz-border)] hover:text-[var(--pz-text)]"
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>

                <ul className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {filteredDams.map((dam) => {
                    const isSelected = hasSelection && dam.id === selectedDamId;
                    return (
                      <li key={dam.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDam(dam);
                            setSearchOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[var(--pz-accent-soft)] border-[var(--pz-accent)]"
                              : "bg-[var(--pz-well)]/70 border-[var(--pz-border)] hover:border-[var(--pz-border-strong)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--pz-text)] truncate">
                              {dam.name}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--pz-muted)] shrink-0">
                              {dam.risk_tier}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--pz-muted)] mt-0.5 flex justify-between gap-2">
                            <span className="truncate">{dam.physical_status_label}</span>
                            <span className="font-mono tabular-nums shrink-0">
                              {dam.lat.toFixed(2)}, {dam.lon.toFixed(2)}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {filteredDams.length === 0 && (
                    <li className="text-xs text-[var(--pz-muted)] text-center py-6">
                      Nenhuma barragem encontrada.
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-2.5">
                <label className="block space-y-1 text-xs">
                  <span className="text-[var(--pz-muted)] font-medium">Nome do local</span>
                  <input
                    type="text"
                    aria-label="Nome do Local"
                    data-testid="custom-name-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex.: Vale do Paraopeba"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] text-xs text-[var(--pz-text)] focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--pz-muted)] font-medium">Latitude</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Latitude"
                      data-testid="custom-lat-input"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="-19.9419"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] font-mono tabular-nums text-xs text-[var(--pz-text)] focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--pz-muted)] font-medium">Longitude</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Longitude"
                      data-testid="custom-lon-input"
                      value={customLon}
                      onChange={(e) => setCustomLon(e.target.value)}
                      placeholder="-43.5997"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] font-mono tabular-nums text-xs text-[var(--pz-text)] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--pz-muted)] font-medium">Início</span>
                    <input
                      type="date"
                      aria-label="Data de início"
                      value={sDate}
                      onChange={(e) => setSDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] font-mono tabular-nums text-xs text-[var(--pz-text)] focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--pz-muted)] font-medium">Fim</span>
                    <input
                      type="date"
                      aria-label="Data de fim"
                      value={eDate}
                      onChange={(e) => setEDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] font-mono tabular-nums text-xs text-[var(--pz-text)] focus:outline-none"
                    />
                  </label>
                </div>

                {(!isDateValid || !isLatValid || !isLonValid) && (
                  <p role="alert" className="inline-flex items-center gap-1.5 text-xs text-rose-500">
                    <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Verifique coordenadas (-90..90 / -180..180) e janela temporal.</span>
                  </p>
                )}

                <button
                  type="submit"
                  data-testid="search-custom-btn"
                  disabled={!canSubmitCustom}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] disabled:opacity-40 font-semibold text-xs transition-opacity cursor-pointer"
                >
                  <CrosshairIcon className="w-3.5 h-3.5" />
                  <span>{loading ? "Analisando..." : "Analisar Coordenada"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Lado Direito: Cenários, Camadas do Mapa, Tema Claro/Escuro e Token */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <nav
          aria-label="Cenários calibrados"
          className="pz-glass hidden lg:flex items-center gap-1 p-1 rounded-full"
        >
          {scenarios.map((sc) => {
            const isActive = hasSelection && activeScenarioId === sc.id;
            const fullLabel = stripDecorativeEmojis(sc.label);
            const pillLabel = SCENARIO_SHORT_LABEL[sc.id] ?? fullLabel;
            const dotHex = SCENARIO_DOT_HEX[sc.id] ?? "#14b8a6";
            return (
              <button
                key={sc.id}
                type="button"
                data-testid={`scenario-btn-${sc.id}`}
                title={fullLabel}
                aria-pressed={isActive}
                onClick={() => onSelectScenario(sc.id, sc.default_start, sc.default_end)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)]"
                    : "text-[var(--pz-secondary)] hover:text-[var(--pz-text)] hover:bg-[var(--pz-accent-soft)]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? "currentColor" : dotHex }}
                  aria-hidden="true"
                />
                <span>{pillLabel}</span>
              </button>
            );
          })}
        </nav>

        <div
          role="group"
          aria-label="Estilo do mapa gratuito"
          className="pz-glass inline-flex items-center gap-1 p-1 rounded-full"
        >
          <span className="pl-2 pr-0.5 text-[var(--pz-muted)] hidden sm:inline-flex" aria-hidden="true">
            <LayersIcon className="w-3.5 h-3.5" />
          </span>
          {(
            [
              { id: "vector", label: "Vetor" },
              { id: "liberty", label: "Topográfico" },
              { id: "satellite", label: "Satélite" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={styleMode === item.id}
              onClick={() => onChangeStyleMode(item.id)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                styleMode === item.id
                  ? "bg-[var(--pz-accent-soft)] text-[var(--pz-accent)] font-semibold"
                  : "text-[var(--pz-secondary)] hover:text-[var(--pz-text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={terrain3D}
            onClick={onToggleTerrain3D}
            title="Ativar relevo topográfico 3D (AWS Terrarium DEM)"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              terrain3D
                ? "bg-[var(--pz-accent)] text-[var(--pz-accent-ink)] font-semibold"
                : "text-[var(--pz-secondary)] hover:text-[var(--pz-text)]"
            }`}
          >
            <MountainIcon className="w-3.5 h-3.5" />
            <span>3D</span>
          </button>
        </div>

        <div
          role="group"
          aria-label="Alternar tema de cores"
          className="pz-glass inline-flex items-center gap-0.5 p-1 rounded-full"
        >
          <button
            type="button"
            data-testid="theme-toggle-btn"
            onClick={onToggleTheme}
            title={
              resolvedTheme === "dark"
                ? "Mudar para tema claro"
                : "Mudar para tema escuro"
            }
            aria-label={
              resolvedTheme === "dark"
                ? "Mudar para tema claro"
                : "Mudar para tema escuro"
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-[var(--pz-text)] hover:bg-[var(--pz-accent-soft)] transition-colors cursor-pointer"
          >
            {resolvedTheme === "dark" ? (
              <MoonIcon className="w-3.5 h-3.5 text-[var(--pz-accent)]" />
            ) : (
              <SunIcon className="w-3.5 h-3.5 text-[var(--pz-accent)]" />
            )}
            <span className="hidden sm:inline">
              {resolvedTheme === "dark" ? "Escuro" : "Claro"}
            </span>
          </button>
          {themePreference !== "system" && (
            <button
              type="button"
              onClick={() => onSetThemePreference("system")}
              title="Voltar ao automático do sistema"
              aria-label="Seguir preferência do sistema"
              className="p-1.5 rounded-full text-[var(--pz-muted)] hover:text-[var(--pz-text)] transition-colors cursor-pointer"
            >
              <MonitorIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="open-token-modal-btn"
          onClick={onOpenTokenModal}
          className={`pz-glass inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            hasValidToken
              ? "pz-status-green"
              : "text-[var(--pz-secondary)] hover:text-[var(--pz-text)] hover:border-[var(--pz-accent)]"
          }`}
        >
          <KeyIcon className="w-3.5 h-3.5 text-[var(--pz-accent)] shrink-0" />
          <span className="hidden sm:inline">
            {hasValidToken ? "Token Earthdata: Ativo" : "Token NASA"}
          </span>
        </button>
      </div>
    </header>
  );
}
