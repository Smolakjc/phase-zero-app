import { DISCLAIMER } from "../constants.js";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";
import { round } from "../utils/math.js";
import { findGranules } from "../services/cmr.js";
import { readGranuleWindow } from "../services/nisar.js";
import { getPowerSeries } from "../services/nasaPower.js";
import { getElevationGrid } from "../services/elevation.js";
import { expectedEnvironmentalMm } from "./environment.js";
import { analyzePixels } from "./pixels.js";
import { classify } from "./classifier.js";

/**
 * Orquestra a análise completa:
 *  1. CMR -> granules NISAR que cobrem o ponto no período
 *  2. Download/leitura da janela de cada granule (deslocamento + correções)
 *  3. NASA POWER -> deslocamento ambiental esperado nas datas das passagens
 *  4. Cálculo por pixel, métricas e classificação
 *
 * Só usa dados reais: sem token, sem granules ou sem série suficiente a
 * análise falha com uma mensagem clara em vez de inventar números.
 */
export async function runAnalysis({ target, options, startDate, endDate, token }) {
  const { lat, lon } = target;
  const earthdataToken = token || config.earthdataToken;
  if (earthdataToken.length < 20) {
    throw new AppError(401, "Token NASA Earthdata ausente. Configure-o para ler os granules NISAR.");
  }

  const granules = await findGranules(lat, lon, startDate, endDate);
  if (granules.length < 2) {
    throw new AppError(
      404,
      `Foram encontrados ${granules.length} granule(s) NISAR GUNW para este ponto e período; são necessários ao menos 2.`,
    );
  }

  // Elevação e clima são independentes dos granules: rodam em paralelo.
  const powerPromise = options.applyNasaPower
    ? getPowerSeries(lat, lon, startDate, endDate)
    : Promise.resolve(null);
  const elevationPromise = getElevationGrid(lat, lon);

  // Granules em sequência: cada um é um download grande.
  const passes = [];
  for (const granule of granules) {
    try {
      passes.push({ granule, window: await readGranuleWindow(granule, lat, lon, earthdataToken) });
    } catch (err) {
      // Token inválido vale para todos os granules: não adianta continuar.
      if (err instanceof AppError && err.status === 401) throw err;
      console.warn(`[nisar] granule ignorado (${granule.title}): ${err.message}`);
    }
  }
  if (passes.length < 2) {
    throw new AppError(422, "Menos de 2 granules puderam ser lidos; não é possível montar a série temporal.");
  }

  const [power, elevation] = await Promise.all([powerPromise, elevationPromise]);
  const dates = passes.map((p) => p.granule.date);
  const expected = dates.map((d) => (power ? expectedEnvironmentalMm(power.byDate[d], power.means) : 0));

  const { pixels, metrics } = analyzePixels({
    lat,
    lon,
    dates,
    windows: passes.map((p) => p.window),
    expected,
    elevation: elevation.grid,
    options,
  });
  if (!metrics) {
    throw new AppError(422, "Todos os pixels ficaram abaixo da coerência mínima. Reduza o limiar.");
  }

  const status = classify(metrics);
  const lastGranule = passes[passes.length - 1].granule;

  return {
    scenario_meta: {
      name: target.name,
      sensor: "NISAR L2 GUNW (Banda L, λ=238.4mm)",
      lat,
      lon,
      los_vector: passes[passes.length - 1].window.los,
      regime_info: `${passes.length} passagens NISAR (${dates[0]} a ${dates[dates.length - 1]})`,
      power_ok: power !== null,
      elevation_ok: elevation.ok,
      asf_status: { latest_granule: `${passes.length} granules NASA CMR | ${lastGranule.title}` },
    },
    status: {
      ...status,
      residual_trend_mm_per_pass: round(metrics.rate),
      acceleration_index_mm: round(metrics.accel),
      max_weighted_anomaly_score: round(metrics.score),
    },
    dates,
    grid_pixels: pixels,
    disclaimer: DISCLAIMER,
  };
}
