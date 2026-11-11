/** Helpers numéricos pequenos usados pelo pipeline. */

export const round = (value, digits = 2) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const mean = (values) => {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n ? sum / n : 0;
};

/** Mediana ignorando NaN/Infinity. Retorna 0 se não houver valores válidos. */
export const median = (values) => {
  const sorted = Array.from(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Índice do elemento de `arr` mais próximo de `target` (funciona em eixos crescentes ou decrescentes). */
export const nearestIndex = (arr, target) => {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < arr.length; i += 1) {
    const d = Math.abs(arr[i] - target);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
};

/**
 * Inclinação (mm por passo) da reta de mínimos quadrados de `series`.
 * Mais robusta a ruído do que comparar apenas primeiro e último ponto.
 */
export const leastSquaresSlope = (series) => {
  const n = series.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - xMean) * (series[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return num / den;
};
