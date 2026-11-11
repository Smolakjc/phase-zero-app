"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { DamCatalogItem, DamPhysicalStatus, StatusCode } from "@phase-zero/shared";

export interface DamMapPanelProps {
  dams: readonly DamCatalogItem[];
  selectedDamId: string | null;
  activeLat: number;
  activeLon: number;
  isFreePoint: boolean;
  loading: boolean;
  onSelectDam: (dam: DamCatalogItem) => void;
  onSelectFreePoint: (lat: number, lon: number) => void;
}

type BaseLayerId = "dark" | "satellite" | "streets";
type StatusFilter = "all" | DamPhysicalStatus;

const TILE_LAYERS: Record<
  BaseLayerId,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  dark: {
    label: "Mapa Escuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 19,
  },
  satellite: {
    label: "Satélite Real",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri World Imagery",
    maxZoom: 18,
  },
  streets: {
    label: "Topográfico / Ruas",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

const REGION_PRESETS: readonly {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
}[] = [
  { id: "br", label: "Brasil", center: [-15.8, -46.5], zoom: 4 },
  { id: "mg", label: "Quadrilátero (MG)", center: [-20.08, -43.78], zoom: 9 },
  { id: "sul", label: "Sul", center: [-27.2, -53.1], zoom: 6 },
  { id: "ne", label: "Norte / Nordeste", center: [-7.2, -42.5], zoom: 5 },
];

const RISK_HEX: Record<StatusCode, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#f43f5e",
};

const RISK_BADGE_CLASSES: Record<StatusCode, string> = {
  GREEN: "bg-emerald-950/90 text-emerald-300 border-emerald-700/70",
  YELLOW: "bg-amber-950/90 text-amber-300 border-amber-700/70",
  RED: "bg-rose-950/90 text-rose-300 border-rose-700/70",
};

const PHYSICAL_BADGE_CLASSES: Record<DamPhysicalStatus, string> = {
  standing: "bg-sky-950/80 text-sky-300 border-sky-800",
  decommissioning: "bg-amber-950/80 text-amber-200 border-amber-700/80",
  collapsed: "bg-fuchsia-950/80 text-fuchsia-200 border-fuchsia-700/80",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMarkerIcon(
  L: typeof LeafletNS,
  dam: DamCatalogItem,
  isSelected: boolean,
): LeafletNS.DivIcon {
  const isCollapsed = dam.physical_status === "collapsed";
  const isDecomm = dam.physical_status === "decommissioning";
  const fill = isCollapsed ? "#d946ef" : RISK_HEX[dam.risk_tier];
  const size = isSelected ? 22 : 15;
  const borderStyle = isCollapsed || isDecomm ? "dashed" : "solid";
  const borderColor = isSelected ? "#ffffff" : isCollapsed ? "#f5d0fe" : "#0f172a";
  const halo = isSelected
    ? "box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.45), 0 0 12px rgba(56, 189, 248, 0.75);"
    : "box-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);";

  const html = `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2px ${borderStyle} ${borderColor};${halo}transition:transform 0.15s ease;"></span>`;

  return L.divIcon({
    className: "phase-zero-dam-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function DamMapPanel({
  dams,
  selectedDamId,
  activeLat,
  activeLon,
  isFreePoint,
  loading,
  onSelectDam,
  onSelectFreePoint,
}: DamMapPanelProps) {
  const searchInputId = useId();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const tileLayerRef = useRef<LeafletNS.TileLayer | null>(null);
  const markersGroupRef = useRef<LeafletNS.LayerGroup | null>(null);
  const freeMarkerRef = useRef<LeafletNS.CircleMarker | null>(null);

  const onSelectDamRef = useRef(onSelectDam);
  const onSelectFreePointRef = useRef(onSelectFreePoint);
  onSelectDamRef.current = onSelectDam;
  onSelectFreePointRef.current = onSelectFreePoint;

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [baseLayer, setBaseLayer] = useState<BaseLayerId>("dark");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mapReady, setMapReady] = useState<boolean>(false);

  const filteredDams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
  }, [dams, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    let standing = 0;
    let decommissioning = 0;
    let collapsed = 0;
    for (const dam of dams) {
      if (dam.physical_status === "standing") standing += 1;
      else if (dam.physical_status === "decommissioning") decommissioning += 1;
      else collapsed += 1;
    }
    return { total: dams.length, standing, decommissioning, collapsed };
  }, [dams]);

  // Inicializa o mapa Leaflet apenas no cliente quando o painel está aberto
  useEffect(() => {
    if (!isOpen) return;
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !mapContainerRef.current) return;
      const L = mod.default ?? mod;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: [-15.8, -46.5],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: true,
      });

      const cfg = TILE_LAYERS[baseLayer];
      const tiles = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);

      map.on("click", (ev: LeafletNS.LeafletMouseEvent) => {
        const lat = Number(ev.latlng.lat.toFixed(5));
        const lon = Number(ev.latlng.lng.toFixed(5));
        onSelectFreePointRef.current(lat, lon);
      });

      mapRef.current = map;
      tileLayerRef.current = tiles;
      markersGroupRef.current = group;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
      markersGroupRef.current = null;
      freeMarkerRef.current = null;
    };
  }, [isOpen]);

  // Atualiza camada base (Escuro / Satélite / Ruas) sem recriar o mapa
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_LAYERS[baseLayer];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  }, [baseLayer, mapReady]);

  // Renderiza marcadores filtrados no mapa e marcador de ponto livre
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = markersGroupRef.current;
    if (!mapReady || !L || !map || !group) return;

    group.clearLayers();

    for (const dam of filteredDams) {
      const isSelected = dam.id === selectedDamId;
      const marker = L.marker([dam.lat, dam.lon], {
        icon: buildMarkerIcon(L, dam, isSelected),
        title: `${dam.name} (${dam.physical_status_label})`,
        alt: `${dam.name} - ${dam.physical_status_label}`,
        zIndexOffset: isSelected ? 500 : dam.physical_status === "collapsed" ? 250 : 100,
      });

      const popupHtml = `
        <div style="min-width:220px;font-family:ui-sans-serif,system-ui,sans-serif;color:#e2e8f0;">
          <div style="font-weight:700;font-size:12px;color:#38bdf8;margin-bottom:3px;">${escapeHtml(dam.name)}</div>
          <div style="font-size:11px;color:#cbd5e1;margin-bottom:4px;">${escapeHtml(dam.location)} (${dam.lat.toFixed(4)}, ${dam.lon.toFixed(4)})</div>
          <div style="font-size:11px;margin-bottom:3px;"><strong>Situação:</strong> ${escapeHtml(dam.physical_status_label)}</div>
          <div style="font-size:11px;color:#94a3b8;"><strong>Janela sugerida:</strong> ${escapeHtml(dam.default_start)} a ${escapeHtml(dam.default_end)}</div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.bindTooltip(`${dam.name} · ${dam.physical_status_label}`, {
        direction: "top",
        offset: [0, -8],
      });

      marker.on("click", (ev: LeafletNS.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(ev);
        onSelectDamRef.current(dam);
        map.flyTo([dam.lat, dam.lon], Math.max(map.getZoom(), 12), { duration: 0.6 });
      });

      marker.addTo(group);
      if (isSelected) {
        marker.openPopup();
      }
    }

    if (freeMarkerRef.current) {
      map.removeLayer(freeMarkerRef.current);
      freeMarkerRef.current = null;
    }

    if (isFreePoint && Number.isFinite(activeLat) && Number.isFinite(activeLon)) {
      freeMarkerRef.current = L.circleMarker([activeLat, activeLon], {
        radius: 9,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#06b6d4",
        fillOpacity: 0.9,
      })
        .bindTooltip(`Ponto livre: ${activeLat.toFixed(4)}, ${activeLon.toFixed(4)}`, {
          direction: "top",
        })
        .addTo(map);
    }
  }, [filteredDams, selectedDamId, isFreePoint, activeLat, activeLon, mapReady]);

  const handleFocusDamFromList = (dam: DamCatalogItem) => {
    onSelectDam(dam);
    if (mapRef.current) {
      mapRef.current.flyTo([dam.lat, dam.lon], 13, { duration: 0.7 });
    }
  };

  const handleRegionZoom = (center: [number, number], zoom: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, zoom, { duration: 0.55 });
    }
  };

  const selectedDam = useMemo(
    () => dams.find((d) => d.id === selectedDamId) ?? null,
    [dams, selectedDamId],
  );

  return (
    <section
      aria-labelledby="dam-map-heading"
      className="animate-enter-2 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dam-map-heading"
              className="text-sm font-mono font-bold uppercase tracking-wider text-sky-400"
            >
              Mapa Interativo de Barragens (De Pé, Descaracterização e Históricas)
            </h2>
            {selectedDam && (
              <span
                className={`px-2 py-0.5 text-[11px] font-mono rounded border ${PHYSICAL_BADGE_CLASSES[selectedDam.physical_status]}`}
              >
                {selectedDam.physical_status_label}
              </span>
            )}
            {isFreePoint && (
              <span className="px-2 py-0.5 text-[11px] font-mono rounded border bg-cyan-950/80 text-cyan-300 border-cyan-700">
                Ponto Livre ({activeLat.toFixed(4)}, {activeLon.toFixed(4)})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Clique em um marcador para selecionar a barragem (com janela de datas automática) ou
            clique em qualquer ponto do mapa para análise livre.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOpen && (
            <>
              <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                {(Object.keys(TILE_LAYERS) as BaseLayerId[]).map((layerId) => (
                  <button
                    key={layerId}
                    type="button"
                    aria-pressed={baseLayer === layerId}
                    onClick={() => setBaseLayer(layerId)}
                    className={`px-2.5 py-1.5 min-h-[28px] rounded-md text-[11px] font-mono font-bold transition ${
                      baseLayer === layerId
                        ? "bg-sky-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {TILE_LAYERS[layerId].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {REGION_PRESETS.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handleRegionZoom(reg.center, reg.zoom)}
                    className="px-2.5 py-1.5 min-h-[28px] rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition"
                  >
                    {reg.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="px-3 py-1.5 min-h-[28px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-sky-300 transition"
          >
            {isOpen ? "Ocultar Mapa" : "Mostrar Mapa de Barragens"}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* MAPA LEAFLET */}
          <div className="lg:col-span-8 flex flex-col gap-2">
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#02050b]">
              <div
                ref={mapContainerRef}
                role="region"
                aria-label="Mapa geográfico interativo das barragens monitoradas"
                className="w-full h-[360px] md:h-[420px] z-0"
              />
              {loading && (
                <div className="pointer-events-none absolute top-3 right-3 z-[400] px-2.5 py-1 rounded-md bg-slate-950/90 border border-sky-700 text-[11px] font-mono text-sky-300">
                  Atualizando análise...
                </div>
              )}
            </div>

            {/* LEGENDA */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-900 inline-block" />
                  De pé (Estável)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 border border-slate-900 inline-block" />
                  Monitoramento / Atenção
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 border border-dashed border-slate-200 inline-block" />
                  Alerta / Descaracterização
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-fuchsia-500 border-2 border-dashed border-fuchsia-200 inline-block" />
                  Rompida / Histórica (janela pré-ruptura)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white inline-block" />
                  Ponto Livre
                </span>
              </div>
              <span className="text-slate-500">
                {filteredDams.length} de {dams.length} estruturas no mapa
              </span>
            </div>
          </div>

          {/* LISTA + BUSCA + FILTROS */}
          <div className="lg:col-span-4 flex flex-col gap-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3 h-[420px] md:h-[462px]">
            <div>
              <label
                htmlFor={searchInputId}
                className="block text-[11px] font-mono text-slate-400 mb-1"
              >
                Buscar barragem, município ou estado
              </label>
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Brumadinho, Itaipu, Mariana, RS..."
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação da barragem">
              {(
                [
                  { id: "all", label: `Todas (${counts.total})` },
                  { id: "standing", label: `De pé (${counts.standing})` },
                  { id: "decommissioning", label: `Descaract. (${counts.decommissioning})` },
                  { id: "collapsed", label: `Rompidas (${counts.collapsed})` },
                ] as const
              ).map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  aria-pressed={statusFilter === flt.id}
                  onClick={() => setStatusFilter(flt.id)}
                  className={`px-2 py-1 min-h-[26px] rounded text-[11px] font-mono border transition ${
                    statusFilter === flt.id
                      ? "bg-sky-600 text-white border-sky-400 font-bold"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>

            <ul className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredDams.map((dam) => {
                const isSelected = dam.id === selectedDamId;
                return (
                  <li key={dam.id}>
                    <button
                      type="button"
                      onClick={() => handleFocusDamFromList(dam)}
                      aria-pressed={isSelected}
                      className={`w-full text-left p-2.5 rounded-lg border transition ${
                        isSelected
                          ? "bg-sky-950/70 border-sky-500 shadow-md shadow-sky-950/50"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-100 leading-snug">
                          {dam.name}
                        </span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${RISK_BADGE_CLASSES[dam.risk_tier]}`}
                        >
                          {dam.risk_tier}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded border ${PHYSICAL_BADGE_CLASSES[dam.physical_status]}`}
                        >
                          {dam.physical_status_label}
                        </span>
                        <span className="text-slate-400">
                          {dam.default_start.slice(0, 4)}–{dam.default_end.slice(0, 4)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredDams.length === 0 && (
                <li className="text-xs font-mono text-slate-500 text-center py-8">
                  Nenhuma barragem encontrada para esse filtro.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
