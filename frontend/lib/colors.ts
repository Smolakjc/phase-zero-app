import {
  detectZoneCategory,
  GridPixel,
  PIXEL_RESIDUAL_THRESHOLDS_MM,
  StatusCode,
  ZoneCategoryId,
} from "@phase-zero/shared";

/**
 * Escala cromática única para canvas 3D, gráficos SVG e diagnóstico (`K-F5`).
 */

export const STATUS_CARD_CLASSES: Record<StatusCode, string> = {
  GREEN: "bg-[#0d2016] border-[#1f5e39] text-[#bbf7d0]",
  YELLOW: "bg-[#20190a] border-[#854d0e] text-[#fef08a]",
  RED: "bg-[#230f16] border-[#9f1239] text-[#fecdd3]",
};

export const STATUS_DOT_CLASSES: Record<StatusCode, string> = {
  GREEN: "bg-[#22c55e]",
  YELLOW: "bg-[#eab308]",
  RED: "bg-[#f43f5e]",
};

export const STATUS_TIER_LABEL: Record<StatusCode, string> = {
  GREEN: "Estável",
  YELLOW: "Atenção",
  RED: "Alerta Crítico",
};

export const STATUS_STROKE_HEX: Record<StatusCode, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#f43f5e",
};

export const STATUS_EMOJI: Record<StatusCode, string> = {
  GREEN: "🟢",
  YELLOW: "🟡",
  RED: "🔴",
};

export interface ZoneVisualStyle {
  id: ZoneCategoryId;
  shortLabel: string;
  fillRgba: string;
  strokeHex: string;
  dotHex: string;
  badgeClass: string;
  radarNote: string;
}

export const ZONE_VISUAL_META: Record<ZoneCategoryId, ZoneVisualStyle> = {
  WATER: {
    id: "WATER",
    shortLabel: "Água / Reservatório",
    fillRgba: "rgba(2, 132, 199, 0.82)",
    strokeHex: "#38bdf8",
    dotHex: "#0284c7",
    badgeClass: "bg-[#082f49] text-[#7dd3fc] border-[#0369a1]",
    radarNote: "Reflexão especular na lâmina d'água (baixa coerência γ < 0.25)",
  },
  CREST: {
    id: "CREST",
    shortLabel: "Mureta / Crista",
    fillRgba: "rgba(56, 189, 248, 0.96)",
    strokeHex: "#e0f2fe",
    dotHex: "#38bdf8",
    badgeClass: "bg-[#0c2d48] text-[#bae6fd] border-[#38bdf8]",
    radarNote: "Coroamento rígido / crista principal (coerência máxima γ > 0.91)",
  },
  SLOPE: {
    id: "SLOPE",
    shortLabel: "Paredão / Talude",
    fillRgba: "rgba(245, 158, 11, 0.95)",
    strokeHex: "#fde68a",
    dotHex: "#f59e0b",
    badgeClass: "bg-[#2a1b08] text-[#fde68a] border-[#d97706]",
    radarNote: "Face estrutural íngreme do maciço (alta coerência γ ~ 0.90)",
  },
  BERM: {
    id: "BERM",
    shortLabel: "Berma de Pé",
    fillRgba: "rgba(168, 85, 247, 0.92)",
    strokeHex: "#e9d5ff",
    dotHex: "#a855f7",
    badgeClass: "bg-[#261238] text-[#e9d5ff] border-[#9333ea]",
    radarNote: "Banqueta de contenção e drenagem na base do paredão (γ ~ 0.82)",
  },
  ABUTMENT: {
    id: "ABUTMENT",
    shortLabel: "Ombreira / Encosta",
    fillRgba: "rgba(20, 184, 166, 0.90)",
    strokeHex: "#99f6e4",
    dotHex: "#14b8a6",
    badgeClass: "bg-[#0b2926] text-[#99f6e4] border-[#0d9488]",
    radarNote: "Encaixe lateral do barramento na rocha/encosta natural (γ ~ 0.73)",
  },
  VEGETATION: {
    id: "VEGETATION",
    shortLabel: "Vegetação Densa",
    fillRgba: "rgba(22, 163, 74, 0.78)",
    strokeHex: "#86efac",
    dotHex: "#16a34a",
    badgeClass: "bg-[#0b2618] text-[#86efac] border-[#15803d]",
    radarNote: "Descorrelação volumétrica por dossel florestal (γ < 0.36, mascarado)",
  },
  VALLEY: {
    id: "VALLEY",
    shortLabel: "Vale / Drenagem",
    fillRgba: "rgba(132, 204, 22, 0.85)",
    strokeHex: "#d9f99d",
    dotHex: "#84cc16",
    badgeClass: "bg-[#1c280c] text-[#d9f99d] border-[#65a30d]",
    radarNote: "Calha aluvial de drenagem a jusante e vegetação rasteira (γ ~ 0.53)",
  },
  HDF5: {
    id: "HDF5",
    shortLabel: "Pixel HDF5 Real",
    fillRgba: "rgba(59, 158, 235, 0.92)",
    strokeHex: "#bfdbfe",
    dotHex: "#3b9eeb",
    badgeClass: "bg-[#132538] text-[#93c5fd] border-[#3b9eeb]",
    radarNote: "Amostra interferométrica lida diretamente do granule HDF5 da NASA",
  },
};

export function getZoneVisualStyle(zone: string): ZoneVisualStyle {
  const cat = detectZoneCategory(zone);
  return ZONE_VISUAL_META[cat];
}

export function getPixelZoneColor(zone: string): string {
  return getZoneVisualStyle(zone).fillRgba;
}

/**
 * Remove emojis decorativos enviados em rótulos legados do backend,
 * preservando apenas o texto técnico limpo para renderização com ícones SVG.
 */
export function stripDecorativeEmojis(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, "")
    .replace(/\(\s*(Verde|Amarelo|Vermelho)\s*:\s*/gi, "($1: ")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getStatusStrokeColor(code: StatusCode): string {
  return STATUS_STROKE_HEX[code] ?? STATUS_STROKE_HEX.RED;
}

/**
 * Cor de preenchimento RGBA para um nó da malha 3D:
 * - Mascarado em zona de água: azul petróleo translúcido
 * - Mascarado em terreno/vegetação: ardósia translúcido
 * - |residual| < 3.5 mm: verde esmeralda
 * - |residual| >= 18.0 mm: vermelho rosa
 * - Caso contrário: amarelo âmbar
 */
export function getPixelNodeColor(
  px: Pick<GridPixel, "masked" | "zone" | "residual_mm">,
): string {
  if (px.masked) {
    return px.zone.includes("ÁGUA")
      ? "rgba(14, 116, 144, 0.32)"
      : "rgba(30, 41, 59, 0.38)";
  }
  const absRes = Math.abs(px.residual_mm);
  if (absRes < PIXEL_RESIDUAL_THRESHOLDS_MM.GREEN_MAX_ABS_MM) {
    return "rgba(16, 185, 129, 0.94)";
  }
  if (absRes >= PIXEL_RESIDUAL_THRESHOLDS_MM.RED_MIN_ABS_MM) {
    return "rgba(244, 63, 94, 0.96)";
  }
  return "rgba(245, 158, 11, 0.94)";
}

export function getMeshEdgeColor(masked: boolean): string {
  return masked ? "rgba(51, 65, 85, 0.28)" : "rgba(56, 189, 248, 0.25)";
}
