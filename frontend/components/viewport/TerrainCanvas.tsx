"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GridPixel, LosVector } from "@phase-zero/shared";
import { getMeshEdgeColor, getPixelNodeColor } from "../../lib/colors";
import {
  buildMesh,
  deriveGridDimensions,
  hitTest,
  ProjectedPixelNode,
  sortByDepth,
} from "../../lib/projection3d";

export interface TerrainCanvasProps {
  pixels: readonly GridPixel[];
  selectedPixelId?: string;
  losVector: LosVector;
  azimuthDeg: number;
  pitchDeg: number;
  onSelectPixel: (px: GridPixel) => void;
  onRotateChange?: (azimuthDeg: number, pitchDeg: number) => void;
}

/**
 * Canvas 3D interativo com suporte a `devicePixelRatio`, `ResizeObserver`,
 * seleção de pixel por clique e rotação por arraste do mouse (`K-F1`).
 */
export function TerrainCanvas({
  pixels,
  selectedPixelId,
  losVector,
  azimuthDeg,
  pitchDeg,
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

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 960,
    height: 450,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      const h = w < 640 ? 380 : 450;
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

    const dims = deriveGridDimensions(pixels);
    const { nodes, segments } = buildMesh(pixels, {
      width,
      height,
      azimuthDeg,
      pitchDeg,
      dims,
    });

    // Desenha arestas da malha 3D
    ctx.lineWidth = 1.1;
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      ctx.strokeStyle = getMeshEdgeColor(seg.masked);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }

    // Ordena nós por profundidade (painter's algorithm)
    const sorted = sortByDepth(nodes);
    for (let i = 0; i < sorted.length; i += 1) {
      const item = sorted[i];
      const { x, y, px } = item;
      const isSelected = selectedPixelId === px.id;
      const radius = isSelected ? 11.0 : px.masked ? 4.8 : 7.4;

      ctx.fillStyle = getPixelNodeColor(px);
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(15, 23, 42, 0.9)";
      ctx.lineWidth = isSelected ? 3.0 : 1.0;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    renderedNodesRef.current = sorted;

    // Vetor LOS
    const cx = width / 2.0;
    const cy = height / 2.0 + 25.0;
    const startX = cx + losVector.losUnitVectorX * 180;
    const startY = 62 + losVector.losUnitVectorY * 55;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(cx, cy - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Textos informativos no HUD
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      `🛰️ VETOR LOS [X:${losVector.losUnitVectorX}, Y:${losVector.losUnitVectorY} | Incidência:${losVector.incidenceAngle}°]`,
      18,
      26,
    );
    ctx.fillStyle = "#10b981";
    ctx.fillText(
      `⛰️ RELEVO DEM REAL AUTO-ESCALADO (${dims.rows}×${dims.cols}): Min ${dims.minElev.toFixed(1)}m | Máx ${dims.maxElev.toFixed(1)}m`,
      18,
      46,
    );
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      "👆 Clique em qualquer nó da malha 3D (ou arraste para girar) para inspecionar a série temporal!",
      18,
      height - 16,
    );
  }, [pixels, selectedPixelId, losVector, azimuthDeg, pitchDeg, size]);

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
    if (!drag || !onRotateChange) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      drag.moved = true;
      const nextAz = Math.max(-85, Math.min(85, Math.round(drag.startAz + dx * 0.35)));
      const nextPitch = Math.max(25, Math.min(78, Math.round(drag.startPitch + dy * 0.25)));
      onRotateChange(nextAz, nextPitch);
    }
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

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        data-testid="terrain-canvas"
        style={{ width: "100%", height: `${size.height}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full bg-[#02050b] rounded-xl border border-slate-800/90 cursor-grab active:cursor-grabbing shadow-inner"
      />
    </div>
  );
}

