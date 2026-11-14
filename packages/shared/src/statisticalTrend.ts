/**
 * Testes Estatísticos para Detecção de Tendências em Séries Temporais InSAR.
 *
 * Implementa os métodos científicos recomendados pelos recursos oficiais do desafio:
 * 1. "Statistical test methods to detect trends in time series data" (Kriss / Medium)
 *    - Teste Não-Paramétrico de Mann-Kendall para monotonicidade.
 *    - Estimador Robusto de Inclinação de Sen (Sen's Slope).
 * 2. "A Comprehensive Guide to Statistical Significance" (Statsig)
 *    - Teste de hipóteses: H0 (estabilidade/ruído) vs Ha (deslocamento real contínuo).
 *    - Nível de significância alfa = 0.05 (confiança de 95%).
 * 3. "Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll..." (NASA NTRS 20090042747)
 *    - Detecção de tendências estatisticamente significativas em dados orbitais.
 */

export interface MannKendallResult {
  s: number;
  varS: number;
  z: number;
  pValue: number;
  sensSlope: number;
  isSignificant: boolean;
  confidenceLevel: string;
  trendDirection: "subsidence" | "uplift" | "stable";
}

/**
 * Aproximação de alta precisão da Função Erro Complementar (erfc).
 * Abramowitz & Stegun 7.1.26 (erro máximo < 1.5e-7).
 */
export function erfc(x: number): number {
  if (x < 0) return 2.0 - erfc(-x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * x);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  return poly * Math.exp(-x * x);
}

/**
 * Calcula o p-valor bicaudal para uma estatística Z da distribuição Normal Padrão.
 */
export function normalTwoTailedPValue(z: number): number {
  const absZ = Math.abs(z);
  const x = absZ / Math.SQRT2;
  const p = erfc(x);
  return Math.max(0, Math.min(1, p));
}

/**
 * Calcula a mediana de um array de números.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2.0;
}

/**
 * Executa o Teste de Mann-Kendall e calcula a inclinação de Sen em uma série temporal.
 *
 * @param series Valores temporais sequenciais (ex: residual de deformação em mm).
 * @param alpha Nível de significância estatística (padrão 0.05 = 95% de confiança).
 */
export function computeMannKendall(
  series: readonly number[],
  alpha = 0.05,
): MannKendallResult {
  const n = series.length;
  if (n < 4) {
    return {
      s: 0,
      varS: 0,
      z: 0,
      pValue: 1.0,
      sensSlope: 0,
      isSignificant: false,
      confidenceLevel: "Indeterminada (< 4 amostras)",
      trendDirection: "stable",
    };
  }

  // 1. Estatística S de Mann-Kendall e todas as inclinações par a par para o estimador de Sen
  let s = 0;
  const slopes: number[] = [];

  for (let k = 0; k < n - 1; k += 1) {
    for (let j = k + 1; j < n; j += 1) {
      const diff = series[j] - series[k];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;

      slopes.push(diff / (j - k));
    }
  }

  // 2. Variância de S (sem empates significativos)
  // Var(S) = [n * (n - 1) * (2n + 5)] / 18
  const varS = (n * (n - 1) * (2 * n + 5)) / 18.0;
  const stdDev = Math.sqrt(varS);

  // 3. Estatística Z com correção de continuidade
  let z = 0;
  if (s > 0) {
    z = (s - 1) / stdDev;
  } else if (s < 0) {
    z = (s + 1) / stdDev;
  }

  // 4. p-valor bicaudal
  const pValue = normalTwoTailedPValue(z);

  // 5. Estimador de Sen (mediana de todas as taxas)
  const sensSlope = median(slopes);

  const isSignificant = pValue < alpha;
  const confidenceLevel =
    pValue < 0.01 ? "99% (Muito Forte)" : pValue < 0.05 ? "95% (Significativo)" : "Não Significativo (Ruído)";

  let trendDirection: "subsidence" | "uplift" | "stable" = "stable";
  if (isSignificant) {
    trendDirection = sensSlope < 0 ? "subsidence" : "uplift";
  }

  return {
    s,
    varS: Math.round(varS * 100) / 100,
    z: Math.round(z * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    sensSlope: Math.round(sensSlope * 100) / 100,
    isSignificant,
    confidenceLevel,
    trendDirection,
  };
}
