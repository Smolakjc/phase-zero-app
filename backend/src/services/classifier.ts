import { CLASSIFICATION_THRESHOLDS, StatusCode } from "@phase-zero/shared";

export interface ClassificationResult {
  code: StatusCode;
  label: string;
  description: string;
}

/**
 * 1. Velocidade Média por Ciclo (slope em mm/passagem de 12 dias).
 */
export function computeSlope(residualSeries: readonly number[]): number {
  const n = residualSeries.length;
  if (n === 0) return 0;
  return (residualSeries[n - 1] - residualSeries[0]) / Math.max(1, n - 1);
}

/**
 * 2. Índice de Aceleração (segunda derivada discreta comparando início, meio e fim).
 */
export function computeAcceleration(residualSeries: readonly number[]): number {
  const n = residualSeries.length;
  if (n === 0) return 0;
  const midIdx = Math.floor(n / 2);
  return residualSeries[n - 1] - 2.0 * residualSeries[midIdx] + residualSeries[0];
}

/**
 * 3. Score Máximo Ponderado pela Coerência (γ).
 */
export function maxScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0.0;
  let best = 0.0;
  for (let i = 0; i < scores.length; i += 1) {
    if (scores[i] > best) {
      best = scores[i];
    }
  }
  return best;
}

/**
 * Classificação nos 3 níveis calibrados (GREEN / YELLOW / RED).
 */
export function classify(slope: number, accel: number, score: number): ClassificationResult {
  const {
    GREEN_MAX_SLOPE_MM_PER_PASS,
    GREEN_MAX_SCORE,
    YELLOW_MAX_SLOPE_MM_PER_PASS,
    YELLOW_MAX_ACCEL_MM,
    YELLOW_MAX_SCORE,
  } = CLASSIFICATION_THRESHOLDS;

  if (Math.abs(slope) < GREEN_MAX_SLOPE_MM_PER_PASS && score < GREEN_MAX_SCORE) {
    return {
      code: "GREEN",
      label: "EXPECTED ENVIRONMENTAL MOTION",
      description:
        "Velocidade residual próxima de zero (< 0.35 mm/ciclo) e Score < 5.0. Movimento 100% explicado pelo clima.",
    };
  }

  if (
    Math.abs(slope) < YELLOW_MAX_SLOPE_MM_PER_PASS &&
    Math.abs(accel) < YELLOW_MAX_ACCEL_MM &&
    score < YELLOW_MAX_SCORE
  ) {
    return {
      code: "YELLOW",
      label: "PERSISTENT RESIDUAL ANOMALY",
      description:
        "Taxa residual constante (entre 0.35 e 1.45 mm/ciclo) sem aceleração brusca (Score entre 5.0 e 19.9). Requer monitoramento.",
    };
  }

  return {
    code: "RED",
    label: "ESCALATING SURFACE ANOMALY",
    description:
      "Velocidade severa (>= 1.45 mm/ciclo), aceleração forte (|Acel| >= 4.5 mm) ou Score >= 20.0 em blocos de alta coerência.",
  };
}

