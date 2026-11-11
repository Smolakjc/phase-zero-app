import {
  GridPixel,
  PIXEL_RESIDUAL_THRESHOLDS_MM,
  StatusCode,
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
