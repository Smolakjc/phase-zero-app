import { STATUS_THRESHOLDS } from "../constants.js";

/**
 * Classificação em 3 níveis a partir de três métricas:
 *  - rate:  tendência residual (mm/passagem)
 *  - accel: índice de aceleração (mm)
 *  - score: maior anomalia ponderada pela coerência
 */
export function classify({ rate, accel, score }) {
  const { green, yellow } = STATUS_THRESHOLDS;

  if (Math.abs(rate) < green.rate && score < green.score) {
    return {
      code: "GREEN",
      label: "EXPECTED ENVIRONMENTAL MOTION",
      description: `Velocidade residual < ${green.rate} mm/ciclo e score < ${green.score}. Movimento explicado pelo clima.`,
    };
  }

  if (Math.abs(rate) < yellow.rate && Math.abs(accel) < yellow.accel && score < yellow.score) {
    return {
      code: "YELLOW",
      label: "PERSISTENT RESIDUAL ANOMALY",
      description: `Taxa residual entre ${green.rate} e ${yellow.rate} mm/ciclo sem aceleração brusca. Requer monitoramento.`,
    };
  }

  return {
    code: "RED",
    label: "ESCALATING SURFACE ANOMALY",
    description: `Velocidade >= ${yellow.rate} mm/ciclo, |aceleração| >= ${yellow.accel} mm ou score >= ${yellow.score} em pixels de boa coerência.`,
  };
}
