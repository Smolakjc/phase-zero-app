"use client";

import React, { useEffect, useRef, useState } from "react";
import type * as MapLibreNS from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DamCatalogItem, StatusCode } from "@phase-zero/shared";
import { ResolvedTheme } from "../../hooks/useTheme";

export type MapStyleMode = "vector" | "liberty" | "satellite";

export interface ObservatoryMapProps {
  dams: readonly DamCatalogItem[];
  selectedDamId: string | null;
  hasSelection: boolean;
  activeLat: number;
  activeLon: number;
  isFreePoint: boolean;
  resolvedTheme: ResolvedTheme;
  styleMode: MapStyleMode;
  terrain3D: boolean;
  regionFlyTarget: { center: [number, number]; zoom: number; nonce: number } | null;
  onSelectDam: (dam: DamCatalogItem) => void;
  onSelectFreePoint: (lat: number, lon: number) => void;
}

const BRAZIL_CENTER: [number, number] = [-47.9, -15.6];
const BRAZIL_ZOOM = 4.1;

const RISK_HEX: Record<StatusCode, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#f43f5e",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSatelliteStyle(): MapLibreNS.StyleSpecification {
  return {
    version: 8,
    sources: {
      "esri-imagery": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: "Tiles &copy; Esri World Imagery",
      },
      "esri-labels": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: "Esri Boundaries &amp; Places",
      },
    },
    layers: [
      {
        id: "esri-imagery-layer",
        type: "raster",
        source: "esri-imagery",
        minzoom: 0,
        maxzoom: 22,
      },
      {
        id: "esri-labels-layer",
        type: "raster",
        source: "esri-labels",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-opacity": 0.9,
        },
      },
    ],
  };
}

function resolveStyleTarget(
  mode: MapStyleMode,
  theme: ResolvedTheme,
): string | MapLibreNS.StyleSpecification {
  if (mode === "satellite") {
    return buildSatelliteStyle();
  }
  if (mode === "liberty") {
    return "https://tiles.openfreemap.org/styles/liberty";
  }
  return theme === "dark"
    ? "https://tiles.openfreemap.org/styles/dark"
    : "https://tiles.openfreemap.org/styles/positron";
}

function createDamMarkerElement(
  dam: DamCatalogItem,
  isSelected: boolean,
  theme: ResolvedTheme,
): HTMLDivElement {
  const isCollapsed = dam.physical_status === "collapsed";
  const isDecomm = dam.physical_status === "decommissioning";
  const fill = isCollapsed ? "#d946ef" : RISK_HEX[dam.risk_tier];
  const size = isSelected ? 22 : 14;
  const ringBorder = isSelected
    ? theme === "dark"
      ? "#f8fafc"
      : "#0f172a"
    : isCollapsed
      ? "#fae8ff"
      : theme === "dark"
        ? "#0b111c"
        : "#ffffff";

  // Container gerenciado exclusivamente pelo MapLibre (posicionamento via translate).
  // JAMAIS aplicar CSS transition em transform neste elemento ou em seus filhos para
  // evitar o efeito de atraso/deslizamento elástico ao arrastar o mapa.
  const container = document.createElement("div");
  container.className = "pz-dam-marker-wrap";
  container.setAttribute("data-dam-id", dam.id);
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.cursor = "pointer";
  container.style.transition = "none";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", `${dam.name} (${dam.physical_status_label})`);
  btn.setAttribute("data-dam-id", dam.id);
  btn.style.width = "100%";
  btn.style.height = "100%";
  btn.style.padding = "0";
  btn.style.margin = "0";
  btn.style.borderRadius = isCollapsed ? "4px" : "9999px";
  btn.style.background = fill;
  btn.style.border = `2.5px ${isCollapsed || isDecomm ? "dashed" : "solid"} ${ringBorder}`;
  btn.style.cursor = "pointer";
  btn.style.display = "block";
  btn.style.boxShadow = isSelected
    ? "0 0 0 6px rgba(45, 212, 191, 0.35), 0 6px 16px rgba(0, 0, 0, 0.4)"
    : "0 2px 8px rgba(0, 0, 0, 0.35)";
  btn.style.transition = "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease";
  if (isCollapsed) {
    btn.style.transform = "rotate(45deg)";
  }
  if (isSelected) {
    btn.classList.add("pz-marker-active");
  }

  container.appendChild(btn);
  return container;
}

function createFreeMarkerElement(): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "pz-free-marker-wrap";
  container.style.width = "18px";
  container.style.height = "18px";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.pointerEvents = "none";
  container.style.transition = "none";

  const dot = document.createElement("div");
  dot.className = "pz-marker-active";
  dot.style.width = "100%";
  dot.style.height = "100%";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#14b8a6";
  dot.style.border = "3px solid #ffffff";
  dot.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.35)";

  container.appendChild(dot);
  return container;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyTerrainToMap(map: MapLibreNS.Map, enabled: boolean): void {
  try {
    if (enabled) {
      if (!map.getSource("aws-terrarium")) {
        map.addSource("aws-terrarium", {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          maxzoom: 15,
          encoding: "terrarium",
          attribution: "DEM &copy; Mapzen / AWS Terrain",
        });
      }
      map.setTerrain({ source: "aws-terrarium", exaggeration: 1.55 });
    } else if (map.getTerrain()) {
      map.setTerrain(null);
    }
  } catch {
    // Estilo ainda carregando ou sem suporte WebGL completo
  }
}

/**
 * Mapa em tela cheia com MapLibre GL JS + OpenFreeMap (Vetorial Claro/Escuro e Relevo Liberty),
 * Satélite gratuito Esri World Imagery e Terreno 3D AWS Terrarium.
 */
export function ObservatoryMap({
  dams,
  selectedDamId,
  hasSelection,
  activeLat,
  activeLon,
  isFreePoint,
  resolvedTheme,
  styleMode,
  terrain3D,
  regionFlyTarget,
  onSelectDam,
  onSelectFreePoint,
}: ObservatoryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mlRef = useRef<typeof MapLibreNS | null>(null);
  const mapRef = useRef<MapLibreNS.Map | null>(null);
  const damMarkersRef = useRef<MapLibreNS.Marker[]>([]);
  const freeMarkerRef = useRef<MapLibreNS.Marker | null>(null);
  const hoverPopupRef = useRef<MapLibreNS.Popup | null>(null);
  const styleSignatureRef = useRef<string>("");
  const lastFlyKeyRef = useRef<string>("");

  const onSelectDamRef = useRef(onSelectDam);
  const onSelectFreePointRef = useRef(onSelectFreePoint);
  const terrain3DRef = useRef(terrain3D);
  const styleModeRef = useRef(styleMode);
  const resolvedThemeRef = useRef(resolvedTheme);
  onSelectDamRef.current = onSelectDam;
  onSelectFreePointRef.current = onSelectFreePoint;
  terrain3DRef.current = terrain3D;
  styleModeRef.current = styleMode;
  resolvedThemeRef.current = resolvedTheme;

  const [mapReady, setMapReady] = useState<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("maplibre-gl").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const rawMod = mod as unknown as { default?: typeof MapLibreNS };
      const ml = (rawMod.default ?? mod) as typeof MapLibreNS;
      mlRef.current = ml;

      const mountMode = styleModeRef.current;
      const mountTheme = resolvedThemeRef.current;
      const mountStyle = resolveStyleTarget(mountMode, mountTheme);
      styleSignatureRef.current =
        mountMode === "vector" ? `${mountMode}:${mountTheme}` : `${mountMode}:fixed`;

      const map = new ml.Map({
        container: containerRef.current,
        style: mountStyle,
        center: BRAZIL_CENTER,
        zoom: BRAZIL_ZOOM,
        minZoom: 2.5,
        maxZoom: 19,
        pitch: terrain3DRef.current ? 50 : 0,
        attributionControl: false,
      });

      map.addControl(
        new ml.NavigationControl({ visualizePitch: true, showCompass: true }),
        "bottom-right",
      );
      map.addControl(new ml.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

      const popup = new ml.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
      });
      hoverPopupRef.current = popup;

      map.on("style.load", () => {
        if (terrain3DRef.current) {
          applyTerrainToMap(map, true);
        }
      });

      map.on("error", () => {
        // Silencia erros transitórios de tile offline/headless
      });

      map.on("click", (e) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest("[data-dam-id]")) {
          return;
        }
        const lat = Number(e.lngLat.lat.toFixed(5));
        const lon = Number(e.lngLat.lng.toFixed(5));
        onSelectFreePointRef.current(lat, lon);
      });

      mapRef.current = map;

      map.once("load", () => {
        if (!cancelled) {
          setMapReady(true);
        }
      });

      // Renderiza marcadores logo após instanciar o mapa sem depender de tiles remotos
      if (!cancelled) {
        setMapReady(true);
      }
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      for (const m of damMarkersRef.current) m.remove();
      damMarkersRef.current = [];
      freeMarkerRef.current?.remove();
      freeMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualiza o estilo do mapa quando o tema (Claro/Escuro) ou camada muda
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sig =
      styleMode === "vector" ? `${styleMode}:${resolvedTheme}` : `${styleMode}:fixed`;
    if (styleSignatureRef.current === sig) return;
    styleSignatureRef.current = sig;

    map.setStyle(resolveStyleTarget(styleMode, resolvedTheme));
  }, [styleMode, resolvedTheme]);

  // Ativa/desativa terreno 3D com transição suave de inclinação
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    applyTerrainToMap(map, terrain3D);
    map.easeTo({
      pitch: terrain3D ? 52 : 0,
      bearing: terrain3D ? -14 : 0,
      duration: prefersReducedMotion() ? 0 : 650,
    });
  }, [terrain3D, mapReady]);

  // Renderiza marcadores do catálogo de barragens
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ml || !map) return;

    for (const marker of damMarkersRef.current) {
      marker.remove();
    }
    damMarkersRef.current = [];

    for (const dam of dams) {
      const isSelected = hasSelection && dam.id === selectedDamId;
      const el = createDamMarkerElement(dam, isSelected, resolvedTheme);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectDamRef.current(dam);
      });

      el.addEventListener("mouseenter", () => {
        const popup = hoverPopupRef.current;
        if (!popup) return;
        popup
          .setLngLat([dam.lon, dam.lat])
          .setHTML(
            `<div style="min-width:190px;">
              <div style="font-weight:700;font-size:12px;margin-bottom:2px;">${escapeHtml(dam.name)}</div>
              <div style="font-size:11px;opacity:0.78;">${escapeHtml(dam.location)}</div>
              <div style="font-size:11px;margin-top:4px;font-weight:600;">${escapeHtml(dam.physical_status_label)}</div>
            </div>`,
          )
          .addTo(map);
      });

      el.addEventListener("mouseleave", () => {
        hoverPopupRef.current?.remove();
      });

      const marker = new ml.Marker({
        element: el,
        anchor: "center",
        subpixelPositioning: true,
      })
        .setLngLat([dam.lon, dam.lat])
        .addTo(map);

      damMarkersRef.current.push(marker);
    }
  }, [dams, selectedDamId, hasSelection, resolvedTheme, mapReady]);

  // Marcador de ponto livre
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ml || !map) return;

    freeMarkerRef.current?.remove();
    freeMarkerRef.current = null;

    if (
      hasSelection &&
      isFreePoint &&
      Number.isFinite(activeLat) &&
      Number.isFinite(activeLon)
    ) {
      const el = createFreeMarkerElement();
      freeMarkerRef.current = new ml.Marker({
        element: el,
        anchor: "center",
        subpixelPositioning: true,
      })
        .setLngLat([activeLon, activeLat])
        .addTo(map);
    }
  }, [hasSelection, isFreePoint, activeLat, activeLon, mapReady]);

  // Voo suave para o local selecionado com padding inferior para não ficar atrás da folha
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasSelection) return;
    if (!Number.isFinite(activeLat) || !Number.isFinite(activeLon)) return;

    const flyKey = `${selectedDamId ?? "free"}:${activeLat.toFixed(4)}:${activeLon.toFixed(4)}`;
    if (lastFlyKeyRef.current === flyKey) return;
    lastFlyKeyRef.current = flyKey;

    const bottomPad =
      typeof window !== "undefined" && window.innerHeight > 720 ? 310 : 180;

    map.flyTo({
      center: [activeLon, activeLat],
      zoom: Math.max(map.getZoom(), 12.6),
      padding: { top: 88, bottom: bottomPad, left: 24, right: 24 },
      duration: prefersReducedMotion() ? 0 : 900,
      essential: true,
    });
  }, [hasSelection, selectedDamId, activeLat, activeLon]);

  // Voo rápido para presets de região
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionFlyTarget) return;

    map.flyTo({
      center: [regionFlyTarget.center[1], regionFlyTarget.center[0]],
      zoom: regionFlyTarget.zoom,
      padding: { top: 80, bottom: hasSelection ? 260 : 40, left: 24, right: 24 },
      duration: prefersReducedMotion() ? 0 : 750,
    });
  }, [regionFlyTarget, hasSelection]);

  return (
    <div
      ref={containerRef}
      data-testid="observatory-map"
      role="region"
      aria-label="Mapa geográfico interativo das barragens monitoradas"
      className="absolute inset-0 w-full h-full bg-[var(--pz-ground)]"
    />
  );
}
