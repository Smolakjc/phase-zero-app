/**
 * Constantes físicas e regras de classificação do PHASE-ZERO.
 * Mantidas num único lugar para facilitar calibração e auditoria.
 */

/** Tamanho (em pixels) da janela quadrada analisada ao redor do ponto. */
export const GRID_SIZE = 18;

/** Espaçamento angular de um pixel (~80 m), usado só para rotular lat/lon. */
export const PIXEL_STEP_DEG = 0.00072;

/** Comprimento de onda NISAR banda L (mm). */
export const WAVELENGTH_NISAR_L_MM = 238.4;

/** Converte fase desenrolada (rad) em deslocamento na linha de visada (mm). */
export const PHASE_TO_MM = -WAVELENGTH_NISAR_L_MM / (4 * Math.PI);

/** Produtos NISAR consultados no CMR da NASA. */
export const NISAR_COLLECTIONS = [
  "NISAR_L2_GUNW_PROVISIONAL_V1",
  "NISAR_L2_GUNW_BETA_V1",
];

/**
 * Coeficientes empíricos do modelo ambiental esperado (mm por unidade do
 * parâmetro, relativo à média da janela). Ajuste conforme calibração local.
 */
export const ENV_MODEL = {
  surfaceTempMmPerC: 0.85,
  solarMmPerWm2: 0.03,
  precipMmPerMm: 0.06,
};

/**
 * Limiares da classificação em 3 níveis. A ordem importa: o primeiro nível
 * cujo critério for satisfeito vence; o que sobrar é VERMELHO.
 *  - rate:  |tendência residual| em mm/passagem
 *  - accel: |índice de aceleração| em mm
 *  - score: pior anomalia ponderada pela coerência
 */
export const STATUS_THRESHOLDS = {
  green: { rate: 0.35, score: 5.0 },
  yellow: { rate: 1.45, accel: 4.5, score: 20.0 },
};

export const DISCLAIMER =
  "Satellite InSAR is a broad-area monitoring and triage layer, " +
  "not a standalone structural safety system. Uses NISAR Provisional Data.";
