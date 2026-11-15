import {
  AppeearsThermoPluvioAnalysis,
  Climate,
  evaluateThermoPluvioShockAndFiveYearForecast,
  HistoricalYearClimateSample,
  shiftIsoDateYears,
} from "@phase-zero/shared";
import { buildCacheKey, CACHE_TTLS, LruCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { fetchLiveNasaPower } from "./nasaPower.js";

export const APPEEARS_API_BASE_URL = "https://appeears.earthdatacloud.nasa.gov/api";
export const APPEEARS_LST_PRODUCT_ID = "MOD11A1.061";

export interface AppeearsLayerMetadata {
  Layer: string;
  Description?: string;
  Units?: string;
}

export type AppeearsProductLayersResponse = Record<string, AppeearsLayerMetadata>;

export interface GetAppeearsAnalysisInput {
  lat: number;
  lon: number;
  start_date: string;
  end_date: string;
  scenario_id?: string;
  custom_name?: string | null;
  earthdata_token?: string | null;
  current_climate: Climate;
  enable_live_fetch?: boolean;
}

const appeearsCache = new LruCache<AppeearsThermoPluvioAnalysis>({
  ttlMs: CACHE_TTLS.POWER_MS,
  maxEntries: 64,
});

/**
 * Consulta a API oficial NASA AppEEARS (`/api/product/MOD11A1.061`) para validar
 * as camadas térmicas orbitais (`LST_Day_1km` e `LST_Night_1km` em Kelvin -> °C).
 * Nunca expõe o token em caso de erro.
 */
export async function fetchAppeearsProductLayers(
  productId = APPEEARS_LST_PRODUCT_ID,
  earthdataToken?: string | null,
): Promise<{ ok: boolean; layers: string[] }> {
  const url = `${APPEEARS_API_BASE_URL}/product/${encodeURIComponent(productId)}`;
  const headers: Record<string, string> = {};
  if (earthdataToken && earthdataToken.trim().length > 20) {
    headers.Authorization = `Bearer ${earthdataToken.trim()}`;
  }

  try {
    const data = await fetchJson<AppeearsProductLayersResponse>(url, {
      timeoutMs: 4500,
      retries: 0,
      headers,
    });
    if (!data || typeof data !== "object") {
      return { ok: false, layers: [] };
    }
    const layers = Object.keys(data);
    return {
      ok: layers.length > 0,
      layers,
    };
  } catch {
    return { ok: false, layers: [] };
  }
}

/**
 * Extrai as séries climáticas homólogas para o período nos anos anteriores
 * (limitado ao máximo de 15 anos), permitindo comparar ano a ano se ocorreu
 * a mesma temperatura com o mesmo índice pluviométrico ou se houve discrepância.
 */
export async function fetchMultiYearHomologousWindows(
  lat: number,
  lon: number,
  startStr: string,
  endStr: string,
  maxYears = 15,
  nSteps = 12,
): Promise<HistoricalYearClimateSample[]> {
  const targetYear = Number(endStr.slice(0, 4)) || Number(startStr.slice(0, 4)) || 2026;
  const startYear = Number(startStr.slice(0, 4)) || 2026;
  const isMultiYearSpan = targetYear - startYear >= 5;
  const currentUtcYear = new Date().getUTCFullYear();
  const yearsCount = Math.min(maxYears, 15);

  const deltas: number[] = [];
  for (let i = yearsCount; i >= 1; i -= 1) {
    deltas.push(-i);
  }

  const tasks = deltas.map(async (delta): Promise<HistoricalYearClimateSample | null> => {
    const histYear = targetYear + delta;
    if (histYear > currentUtcYear) {
      return null;
    }
    const wStart = isMultiYearSpan
      ? `${String(histYear).padStart(4, "0")}-01-01`
      : shiftIsoDateYears(startStr, delta);
    const wEnd = isMultiYearSpan
      ? `${String(histYear).padStart(4, "0")}-${endStr.slice(5)}`
      : shiftIsoDateYears(endStr, delta);
    try {
      const climate = await fetchLiveNasaPower(lat, lon, wStart, wEnd, nSteps);
      return {
        year: histYear,
        start_date: wStart,
        end_date: wEnd,
        climate,
      };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(tasks);
  return settled.filter((item): item is HistoricalYearClimateSample => item !== null);
}

export const fetchFiveYearHomologousWindows = fetchMultiYearHomologousWindows;

/**
 * Executa a análise integrada NASA AppEEARS de Choque Termo-Pluviométrico (Mudança Brusca Quente-Frio + Chuvas)
 * e Previsão Histórica Multianual (limitada a 15 anos).
 */
export async function getAppeearsThermoPluvioAnalysis(
  input: GetAppeearsAnalysisInput,
): Promise<AppeearsThermoPluvioAnalysis> {
  const cacheKey = `${buildCacheKey(
    "appeears",
    input.lat,
    input.lon,
    input.start_date,
    input.end_date,
  )}:${input.scenario_id ?? "custom"}:${input.custom_name ?? ""}:${input.enable_live_fetch ? "live" : "synth"}`;

  return appeearsCache.getOrLoad(cacheKey, async () => {
    let appeearsLiveOk = false;
    let historicalSamples: HistoricalYearClimateSample[] = [];

    if (input.enable_live_fetch) {
      const [productCheck, samples] = await Promise.all([
        fetchAppeearsProductLayers(APPEEARS_LST_PRODUCT_ID, input.earthdata_token),
        fetchMultiYearHomologousWindows(
          input.lat,
          input.lon,
          input.start_date,
          input.end_date,
          15,
          12,
        ),
      ]);
      appeearsLiveOk = productCheck.ok || samples.length >= 3;
      historicalSamples = samples;
    }

    return evaluateThermoPluvioShockAndFiveYearForecast({
      lat: input.lat,
      lon: input.lon,
      start_date: input.start_date,
      end_date: input.end_date,
      scenario_id: input.scenario_id,
      custom_name: input.custom_name,
      current_climate: input.current_climate,
      historical_5y_samples: historicalSamples,
      appeears_live_ok: appeearsLiveOk,
      total_years_limit: 15,
    });
  });
}

export function clearAppeearsCache(): void {
  appeearsCache.clear();
}
