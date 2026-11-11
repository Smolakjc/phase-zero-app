import { GRID_SIZE, PIXEL_STEP_DEG } from "../constants.js";
import { mean, round, leastSquaresSlope } from "../utils/math.js";

/**
 * Núcleo numérico da análise (sem rede, sem disco: fácil de testar).
 *
 * Para cada pixel e cada passagem:
 *   compensado = bruto - (ionosfera + troposfera + marés), conforme habilitado
 *   residual   = compensado - esperado_ambiental            (se habilitado)
 *
 * @param {object}   input
 * @param {string[]} input.dates      Data de cada passagem (ordem cronológica).
 * @param {Array}    input.windows    Janela NISAR de cada passagem (ver `readGranuleWindow`).
 * @param {number[]} input.expected   Deslocamento ambiental esperado por passagem (mm).
 * @param {number[][]} input.elevation Grade de elevação [row][col] em metros.
 * @param {object}   input.options    Flags de correção e `minCoherence`.
 * @returns {{ pixels: object[], metrics: object|null }} `metrics` é null se todos os pixels forem mascarados.
 */
export function analyzePixels({ lat, lon, dates, windows, expected, elevation, options }) {
  const steps = dates.length;
  const center = (GRID_SIZE - 1) / 2;
  const expectedApplied = options.applyNasaPower ? expected : expected.map(() => 0);
  const pixels = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const idx = row * GRID_SIZE + col;
      const raw = [];
      const compensated = [];
      const residual = [];
      const loop = [];

      for (let s = 0; s < steps; s += 1) {
        const w = windows[s];
        let value = w.raw[idx];
        if (options.applyIonosphere) value -= w.iono[idx];
        if (options.applyTroposphere) value -= w.tropo[idx];
        if (options.applySolidTides) value -= w.tides[idx];
        const res = value - expectedApplied[s];

        raw.push(round(w.raw[idx]));
        compensated.push(round(value));
        residual.push(round(res));
        loop.push({ date: dates[s], displacement_mm: round(value), residual_mm: round(res) });
      }

      const coherence = mean(windows.map((w) => w.coherence[idx]));
      const masked = coherence < options.minCoherence;
      const lastResidual = residual[steps - 1];
      const elevationM = elevation[row][col];

      pixels.push({
        id: `px_${row}_${col}`,
        row,
        col,
        zone: describeZone(coherence, elevationM),
        lat: round(lat + (row - center) * PIXEL_STEP_DEG, 6),
        lon: round(lon + (col - center) * PIXEL_STEP_DEG, 6),
        elevation_m: round(elevationM, 1),
        coherence: round(coherence, 3),
        compensated_los_mm: compensated[steps - 1],
        residual_mm: lastResidual,
        masked,
        anomaly_score: round(masked ? 0 : Math.abs(lastResidual) * coherence),
        iono_uncertainty_mm: round(windows[steps - 1].ionoUncertaintyMm),
        pixel_time_series: {
          observed_raw_mm: raw,
          observed_compensated_mm: compensated,
          expected_environmental_mm: expected.map((v) => round(v)),
          residual_anomaly_mm: residual,
          thermo_loop: loop,
        },
      });
    }
  }

  return { pixels, metrics: computeMetrics(pixels, steps) };
}

/**
 * Rótulo do tipo de superfície deduzido da coerência medida
 * (coerência muito baixa indica água ou vegetação densa).
 * O trecho "ÁGUA" é usado pelo frontend para pintar o pixel.
 */
function describeZone(coherence, elevationM) {
  if (coherence < 0.2) return "ÁGUA / SEM COERÊNCIA";
  return `TERRENO COERENTE (Alt: ${Math.round(elevationM)}m)`;
}

/**
 * Métricas oficiais, calculadas no pixel não mascarado de maior score
 * (o ponto mais crítico da janela):
 *  - rate:  inclinação por mínimos quadrados da série residual (mm/passagem)
 *  - accel: segunda diferença discreta (último - 2*meio + primeiro), em mm
 *  - score: maior anomalia ponderada pela coerência
 */
function computeMetrics(pixels, steps) {
  const valid = pixels.filter((p) => !p.masked);
  if (!valid.length) return null;

  const critical = valid.reduce((best, p) => (p.anomaly_score > best.anomaly_score ? p : best));
  const series = critical.pixel_time_series.residual_anomaly_mm;
  const accel = steps >= 3 ? series[steps - 1] - 2 * series[steps >> 1] + series[0] : 0;

  return {
    rate: leastSquaresSlope(series),
    accel,
    score: critical.anomaly_score,
    criticalPixelId: critical.id,
  };
}
