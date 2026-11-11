"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { DamCatalogItem, DamPhysicalStatus, StatusCode } from "@phase-zero/shared";
import { ChevronDownIcon, SearchIcon } from "../icons/SurveyIcons";

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
    label: "Escuro",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri Dark Gray",
    maxZoom: 16,
  },
  satellite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri World Imagery",
    maxZoom: 18,
  },
  streets: {
    label: "Topográfico",
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
  { id: "mg", label: "MG", center: [-20.08, -43.78], zoom: 9 },
  { id: "sul", label: "Sul", center: [-27.2, -53.1], zoom: 6 },
  { id: "ne", label: "N / NE", center: [-7.2, -42.5], zoom: 5 },
];

const RISK_HEX: Record<StatusCode, string> = {
  GREEN: "#22c55e",
  YELLOW: "#eab308",
  RED: "#f43f5e",
};

const RISK_BADGE_CLASSES: Record<StatusCode, string> = {
  GREEN: "bg-[#0d2016] text-[#86efac] border-[#1f5e39]",
  YELLOW: "bg-[#20190a] text-[#fde047] border-[#854d0e]",
  RED: "bg-[#230f16] text-[#fda4af] border-[#9f1239]",
};

const PHYSICAL_BADGE_CLASSES: Record<DamPhysicalStatus, string> = {
  standing: "bg-[#132538] text-[#93c5fd] border-[#254d73]",
  decommissioning: "bg-[#20190a] text-[#fde047] border-[#854d0e]",
  collapsed: "bg-[#26122c] text-[#f0abfc] border-[#86198f]",
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
  const size = isSelected ? 20 : 14;
  const borderStyle = isCollapsed || isDecomm ? "dashed" : "solid";
  const borderColor = isSelected ? "#eef2f6" : isCollapsed ? "#f5d0fe" : "#0c0f14";
  const radius = isCollapsed ? "3px" : "9999px";
  const transform = isCollapsed ? "transform:rotate(45deg);" : "";
  const halo = isSelected
    ? "box-shadow: 0 0 0 4px rgba(59, 158, 235, 0.45);"
    : "box-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);";

  const html = `<span style="display:block;width:${size}px;height:${size}px;border-radius:${radius};background:${fill};border:2px ${borderStyle} ${borderColor};${transform}${halo}transition:transform 0.15s ease;"></span>`;

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
      map.attributionControl?.setPrefix("Leaflet");

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
        <div style="min-width:210px;font-family:var(--font-sans),system-ui,sans-serif;color:#eef2f6;">
          <div style="font-weight:700;font-size:12px;color:#3b9eeb;margin-bottom:3px;">${escapeHtml(dam.name)}</div>
          <div style="font-size:11px;color:#a1adbf;margin-bottom:4px;">${escapeHtml(dam.location)} (${dam.lat.toFixed(4)}, ${dam.lon.toFixed(4)})</div>
          <div style="font-size:11px;margin-bottom:3px;"><strong>Situação:</strong> ${escapeHtml(dam.physical_status_label)}</div>
          <div style="font-size:11px;color:#8a96a8;"><strong>Janela:</strong> ${escapeHtml(dam.default_start)} a ${escapeHtml(dam.default_end)}</div>
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
    }

    if (freeMarkerRef.current) {
      map.removeLayer(freeMarkerRef.current);
      freeMarkerRef.current = null;
    }

    if (isFreePoint && Number.isFinite(activeLat) && Number.isFinite(activeLon)) {
      freeMarkerRef.current = L.circleMarker([activeLat, activeLon], {
        radius: 8,
        color: "#eef2f6",
        weight: 2,
        fillColor: "#3b9eeb",
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
      className="bg-[#131820] border border-[#222933] rounded-lg p-4 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dam-map-heading"
              className="text-sm font-bold text-[#eef2f6]"
            >
              Mapa Geográfico de Barragens
            </h2>
            {selectedDam && (
              <span
                className={`px-2 py-0.5 text-[11px] font-medium rounded border ${PHYSICAL_BADGE_CLASSES[selectedDam.physical_status]}`}
              >
                {selectedDam.physical_status_label}
              </span>
            )}
            {isFreePoint && (
              <span className="px-2 py-0.5 text-[11px] font-mono tabular-nums rounded border bg-[#132538] text-[#93c5fd] border-[#254d73]">
                Ponto Livre ({activeLat.toFixed(4)}, {activeLon.toFixed(4)})
              </span>
            )}
          </div>
          <p className="text-xs text-[#8a96a8] mt-0.5">
            Selecione uma estrutura monitorada ou clique no mapa para consulta livre.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isOpen && (
            <>
              <div
                role="group"
                aria-label="Camada do mapa"
                className="inline-flex items-center rounded-md bg-[#080b0f] p-0.5 border border-[#222933]"
              >
                {(Object.keys(TILE_LAYERS) as BaseLayerId[]).map((layerId) => (
                  <button
                    key={layerId}
                    type="button"
                    aria-pressed={baseLayer === layerId}
                    onClick={() => setBaseLayer(layerId)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      baseLayer === layerId
                        ? "bg-[#132538] text-[#eef2f6] border border-[#3b9eeb]"
                        : "text-[#a1adbf] hover:text-[#eef2f6] border border-transparent"
                    }`}
                  >
                    {TILE_LAYERS[layerId].label}
                  </button>
                ))}
              </div>

              <div className="hidden sm:inline-flex items-center gap-1">
                {REGION_PRESETS.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => handleRegionZoom(reg.center, reg.zoom)}
                    className="px-2 py-1 rounded-md bg-[#080b0f] hover:bg-[#1a222d] border border-[#222933] text-[11px] text-[#a1adbf] hover:text-[#eef2f6] transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#181e28] hover:bg-[#222b39] border border-[#313b49] text-xs font-medium text-[#eef2f6] transition-colors cursor-pointer"
          >
            <span>{isOpen ? "Ocultar" : "Mostrar"}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3">
          <div className="relative rounded-md overflow-hidden border border-[#222933] bg-[#080b0f]">
            <div
              ref={mapContainerRef}
              role="region"
              aria-label="Mapa geográfico interativo das barragens monitoradas"
              className="w-full h-[250px] z-0"
            />
            {loading && (
              <div className="pointer-events-none absolute top-2.5 right-2.5 z-[400] px-2.5 py-1 rounded bg-[#0c0f14]/90 border border-[#3b9eeb] text-[11px] text-[#93c5fd]">
                Atualizando análise...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-[#080b0f] border border-[#222933] text-[11px] text-[#a1adbf]">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" aria-hidden="true" />
                Estável
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block" aria-hidden="true" />
                Atenção
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] border border-dashed border-[#eef2f6] inline-block"
                  aria-hidden="true"
                />
                Descaracterização / Alerta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#d946ef] border border-dashed border-[#f5d0fe] inline-block"
                  aria-hidden="true"
                />
                Histórica / Rompida
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b9eeb] border border-[#eef2f6] inline-block" aria-hidden="true" />
                Ponto Livre
              </span>
            </div>
            <span className="font-mono tabular-nums text-[#8a96a8]">
              {filteredDams.length}/{dams.length}
            </span>
          </div>

          <div className="bg-[#080b0f] border border-[#222933] rounded-md p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <label htmlFor={searchInputId} className="sr-only">
                  Buscar barragem, município ou estado
                </label>
                <SearchIcon className="w-3.5 h-3.5 text-[#8a96a8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id={searchInputId}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar barragem, município ou UF..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded bg-[#131820] border border-[#222933] focus:border-[#3b9eeb] text-xs text-[#eef2f6] placeholder:text-[#687588] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por situação da barragem">
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
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                      statusFilter === flt.id
                        ? "bg-[#132538] text-[#eef2f6] border-[#3b9eeb]"
                        : "bg-[#131820] text-[#a1adbf] border-[#222933] hover:text-[#eef2f6]"
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="max-h-[126px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
              {filteredDams.map((dam) => {
                const isSelected = dam.id === selectedDamId;
                return (
                  <li key={dam.id}>
                    <button
                      type="button"
                      onClick={() => handleFocusDamFromList(dam)}
                      aria-pressed={isSelected}
                      className={`w-full text-left px-2.5 py-2 rounded border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#132538] border-[#3b9eeb]"
                          : "bg-[#131820] border-[#222933] hover:border-[#313b49] hover:bg-[#171d27]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-[#eef2f6] leading-snug line-clamp-1">
                          {dam.name}
                        </span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${RISK_BADGE_CLASSES[dam.risk_tier]}`}
                        >
                          {dam.risk_tier}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#8a96a8]">
                        <span className="truncate">{dam.physical_status_label}</span>
                        <span className="font-mono tabular-nums shrink-0">
                          {dam.default_start.slice(0, 4)}–{dam.default_end.slice(0, 4)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {filteredDams.length === 0 && (
                <li className="sm:col-span-2 text-xs text-[#8a96a8] text-center py-5">
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
