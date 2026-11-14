"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GridPixel, LosVector } from "@phase-zero/shared";
import {
  getMeshEdgeColor,
  getPixelNodeColor,
  getPixelZoneColor,
  getZoneVisualStyle,
} from "../../lib/colors";
import {
  buildMesh,
  deriveGridDimensions,
  hitTest,
  ProjectedPixelNode,
  sortByDepth,
} from "../../lib/projection3d";

import type { ResolvedTheme } from "../../hooks/useTheme";

export type TerrainColorMode = "anomaly" | "zones";

export interface TerrainCanvasProps {
  pixels: readonly GridPixel[];
  selectedPixelId?: string;
  losVector: LosVector;
  azimuthDeg: number;
  pitchDeg: number;
  colorMode?: TerrainColorMode;
  resolvedTheme?: ResolvedTheme;
  onSelectPixel: (px: GridPixel) => void;
  onRotateChange?: (azimuthDeg: number, pitchDeg: number) => void;
}

/**
 * Canvas 3D interativo com suporte a `devicePixelRatio`, `ResizeObserver`,
 * inspeção de zona por hover, seleção de pixel por clique e rotação por arraste (`K-F1`).
 */
export function TerrainCanvas({
  pixels,
  selectedPixelId,
  losVector,
  azimuthDeg,
  pitchDeg,
  colorMode = "anomaly",
  resolvedTheme = "light",
  onSelectPixel,
  onRotateChange,
}: TerrainCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderedNodesRef = useRef<ProjectedPixelNode[]>([]);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startAz: number;
    startPitch: number;
    moved: boolean;
  } | null>(null);

  const [hoveredPixel, setHoveredPixel] = useState<GridPixel | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 680,
    height: 390,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(300, Math.floor(entry.contentRect.width));
      const h = w < 520 ? 350 : 390;
      setSize({ width: w, height: h });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || pixels.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const { width, height } = size;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isDark = resolvedTheme === "dark";

    // Grade cartográfica de referência sutil no fundo
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.07)" : "rgba(15, 23, 42, 0.06)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = gridStep; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = gridStep; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const dims = deriveGridDimensions(pixels);
    const { nodes, segments } = buildMesh(pixels, {
      width,
      height,
      azimuthDeg,
      pitchDeg,
      dims,
    });

    // Arestas da malha 3D
    ctx.lineWidth = 1.05;
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      ctx.strokeStyle =
        colorMode === "zones"
          ? isDark
            ? "rgba(148, 163, 184, 0.28)"
            : "rgba(51, 65, 85, 0.26)"
          : isDark
            ? getMeshEdgeColor(seg.masked)
            : seg.masked
              ? "rgba(100, 116, 139, 0.22)"
              : "rgba(15, 118, 110, 0.34)";
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }

    // Nós ordenados por profundidade
    const sorted = sortByDepth(nodes);
    for (let i = 0; i < sorted.length; i += 1) {
      const item = sorted[i];
      const { x, y, px } = item;
      const isSelected = selectedPixelId === px.id;
      const isHovered = hoveredPixel?.id === px.id;
      const zoneStyle = getZoneVisualStyle(px.zone);

      const baseRadius =
        colorMode === "zones"
          ? zoneStyle.id === "CREST" || zoneStyle.id === "SLOPE"
            ? 6.6
            : 5.4
          : px.masked
            ? 4.4
            : 6.4;
      const radius = isSelected ? 9.5 : isHovered ? baseRadius + 1.8 : baseRadius;

      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected
          ? isDark
            ? "rgba(45, 212, 191, 0.78)"
            : "rgba(15, 118, 110, 0.78)"
          : isDark
            ? "rgba(226, 232, 240, 0.5)"
            : "rgba(15, 23, 42, 0.45)";
        ctx.lineWidth = isSelected ? 2.2 : 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 3.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle =
        colorMode === "zones"
          ? getPixelZoneColor(px.zone)
          : getPixelNodeColor(px);
      ctx.strokeStyle = isSelected
        ? isDark
          ? "#f8fafc"
          : "#0f172a"
        : colorMode === "zones"
          ? zoneStyle.strokeHex
          : isDark
            ? "rgba(12, 15, 20, 0.9)"
            : "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = isSelected ? 2.5 : colorMode === "zones" ? 1.15 : 1.0;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    renderedNodesRef.current = sorted;

    // Vetor LOS com seta vetorial
    const cx = width / 2.0;
    const cy = height / 2.0 + 25.0;
    const startX = cx + losVector.losUnitVectorX * 165;
    const startY = 58 + losVector.losUnitVectorY * 50;
    const endX = cx;
    const endY = cy - 22;

    const losColor = isDark ? "#2dd4bf" : "#0f766e";
    ctx.strokeStyle = losColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = 8;
    ctx.fillStyle = losColor;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle - Math.PI / 6),
      endY - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      endX - headLen * Math.cos(angle + Math.PI / 6),
      endY - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Leituras geodésicas limpas sem emojis
    ctx.fillStyle = isDark ? "#5eead4" : "#0f766e";
    ctx.font = "600 11px monospace";
    ctx.fillText(
      `LOS [X:${losVector.losUnitVectorX} Y:${losVector.losUnitVectorY} | Inc:${losVector.incidenceAngle}°]`,
      14,
      22,
    );
    ctx.fillStyle = isDark ? "#cbd5e1" : "#334155";
    ctx.fillText(
      `DEM ${dims.rows}x${dims.cols} · Min ${dims.minElev.toFixed(1)}m · Max ${dims.maxElev.toFixed(1)}m`,
      14,
      40,
    );
    ctx.fillStyle = isDark ? "#94a3b8" : "#526377";
    const hint =
      width < 460
        ? "Arraste para orbitar · Clique num nó para inspecionar"
        : "Arraste para orbitar a malha · Passe o mouse ou clique num nó para identificar a zona";
    ctx.fillText(hint, 14, height - 14);
  }, [pixels, selectedPixelId, hoveredPixel, losVector, azimuthDeg, pitchDeg, colorMode, resolvedTheme, size]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startAz: azimuthDeg,
      startPitch: pitchDeg,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (drag && onRotateChange) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        drag.moved = true;
        const nextAz = Math.max(-85, Math.min(85, Math.round(drag.startAz + dx * 0.35)));
        const nextPitch = Math.max(25, Math.min(78, Math.round(drag.startPitch + dy * 0.25)));
        onRotateChange(nextAz, nextPitch);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * size.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * size.height;
    const hit = hitTest(renderedNodesRef.current, mouseX, mouseY, 18);
    setHoveredPixel((prev) => (prev?.id === hit?.id ? prev : hit));
  };

  const handlePointerLeave = () => {
    dragStateRef.current = null;
    setHoveredPixel(null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    if (drag?.moved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * size.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * size.height;

    const hit = hitTest(renderedNodesRef.current, clickX, clickY, 22);
    if (hit) {
      onSelectPixel(hit);
    }
  };

  const activeInspect = hoveredPixel;
  const activeStyle = activeInspect ? getZoneVisualStyle(activeInspect.zone) : null;

  return (
    <div ref={containerRef} className="w-full relative">
      <canvas
        ref={canvasRef}
        data-testid="terrain-canvas"
        style={{ width: "100%", height: `${size.height}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        className="block w-full bg-[var(--pz-well)] rounded-xl border border-[var(--pz-border)] cursor-grab active:cursor-grabbing"
      />
      {activeInspect && activeStyle && (
        <div
          className="pointer-events-none absolute top-2.5 right-2.5 max-w-[280px] rounded-xl pz-glass-strong px-2.5 py-1.5 text-[11px]"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[var(--pz-text)] truncate">
              {activeStyle.shortLabel}
            </span>
            <span className="font-mono text-[10px] text-[var(--pz-accent)]">
              {activeInspect.id} · {activeInspect.elevation_m}m
            </span>
          </div>
          <div className="text-[10px] text-[var(--pz-muted)] truncate mt-0.5">
            {activeInspect.zone}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px]">
            <span className={activeInspect.masked ? "text-[var(--pz-danger-ink)]" : "text-[var(--pz-ok-ink)]"}>
              γ={activeInspect.coherence.toFixed(2)} {activeInspect.masked ? "(Mascarado)" : "(Válido)"}
            </span>
            <span className="text-[var(--pz-text)]">Res: {activeInspect.residual_mm} mm</span>
          </div>
        </div>
      )}
    </div>
  );
}
