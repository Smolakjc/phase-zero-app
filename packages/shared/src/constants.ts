/**
 * Constantes físicas, geométricas e limiares calibrados do PHASE-ZERO v5.0.
 */

/** Comprimento de onda do radar NISAR Banda L (~24 cm) em milímetros. */
export const LAMBDA_NISAR_L_MM = 238.4;

/** Comprimento de onda do radar Sentinel-1 Banda C (~5.6 cm) em milímetros. */
export const LAMBDA_SENTINEL_C_MM = 55.5;

/** Fator de conversão de fase desenrolada (rad) para deslocamento LOS (mm) na Banda L. */
export const PHASE_TO_MM_NISAR_L = -LAMBDA_NISAR_L_MM / (4.0 * Math.PI);

/** Dimensão lateral da malha quadrada de pixels (18×18 = 324 blocos de 80m×80m). */
export const GRID_SIZE = 18;

/** Passo angular aproximado (~80 m) em graus de latitude/longitude por pixel. */
export const PIXEL_STEP_DEG = 0.00072;

/** ID do pixel de referência no talude central usado para as 3 métricas oficiais. */
export const REFERENCE_PIXEL_ROW = 10;
export const REFERENCE_PIXEL_COL = 9;
export const REFERENCE_PIXEL_ID = `px_${REFERENCE_PIXEL_ROW}_${REFERENCE_PIXEL_COL}`;

/** Limiares calibrados de classificação em 3 níveis (Verde / Amarelo / Vermelho). */
export const CLASSIFICATION_THRESHOLDS = {
  /** |Velocidade| < 0.35 mm/ciclo para regime Verde. */
  GREEN_MAX_SLOPE_MM_PER_PASS: 0.35,
  /** Score < 5.0 para regime Verde. */
  GREEN_MAX_SCORE: 5.0,
  /** |Velocidade| < 1.45 mm/ciclo para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_SLOPE_MM_PER_PASS: 1.45,
  /** |Aceleração| < 4.5 mm para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_ACCEL_MM: 4.5,
  /** Score < 20.0 para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_SCORE: 20.0,
} as const;

/** Limiares de coloração visual por pixel na malha 3D (residual em mm). */
export const PIXEL_RESIDUAL_THRESHOLDS_MM = {
  GREEN_MAX_ABS_MM: 3.5,
  RED_MIN_ABS_MM: 18.0,
} as const;

/** Coleções consultadas no NASA CMR. */
export const CMR_SHORT_NAMES = [
  "NISAR_L2_GUNW_PROVISIONAL_V1",
  "NISAR_L2_GUNW_BETA_V1",
  "OPERA_L3_DISP-S1_V1",
  "ARIA_S1_GUNW",
] as const;

/** Aviso oficial exibido no rodapé e retornado pela API. */
export const OFFICIAL_DISCLAIMER =
  "Satellite InSAR is a broad-area monitoring and triage layer, " +
  "not a standalone structural safety system. Uses NISAR Provisional Data.";

