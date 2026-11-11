import { Climate, ClimateResult } from "@phase-zero/shared";
import { buildCacheKey, CACHE_TTLS, LruCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { arange, linspaceInt } from "../lib/math.js";

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      TS?: Record<string, number>;
      T2M?: Record<string, number>;
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
      PRECTOTCORR?: Record<string, number>;
      RH2M?: Record<string, number>;
      PS?: Record<string, number>;
    };
  };
}

const MISSING_VALUE = -999;
const powerCache = new LruCache<Climate>({ ttlMs: CACHE_TTLS.POWER_MS, maxEntries: 64 });

function parseIsoDateUtc(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Fallback climático sintético (senoides calibradas), idêntico ao ramo `except` do Python v4.2.
 * Inclui correção de datas inválidas ou invertidas (`end <= start -> +180 dias`).
 */
export function syntheticClimate(startStr: string, endStr: string, nSteps = 16): Climate {
  let d0 = parseIsoDateUtc(startStr);
  let d1 = parseIsoDateUtc(endStr);

  if (!d0 || !d1) {
    d0 = new Date("2026-03-01T00:00:00Z");
    d1 = new Date("2026-09-15T00:00:00Z");
  } else if (d1.getTime() <= d0.getTime()) {
    d1 = new Date(d0.getTime() + 180 * 24 * 60 * 60 * 1000);
  }

  const deltaMs = (d1.getTime() - d0.getTime()) / Math.max(1, nSteps - 1);
  const dates: string[] = [];
  for (let i = 0; i < nSteps; i += 1) {
    const dt = new Date(d0.getTime() + Math.floor(deltaMs * i));
    dates.push(dt.toISOString().slice(0, 10));
  }

  const tIdx = arange(nSteps);
  const ts = tIdx.map((t) => 25.0 + 5.5 * Math.sin(t * 0.6));
  const sw = tIdx.map((t) => 205.0 + 48.0 * Math.sin(t * 0.6));
  const precip = tIdx.map((t) => Math.max(0.0, 38.0 * Math.sin(t * 0.5)));
  const rh = tIdx.map((t) => 65.0 + 14.0 * Math.cos(t * 0.7));
  const ps = tIdx.map(() => 96.0);

  return { dates, ts, sw, precip, rh, ps };
}

/**
 * Busca dados reais da API NASA POWER (`fetch_live_nasa_power`).
 * Lança erro se houver menos de 4 dias válidos ou falha HTTP/timeout.
 */
export async function fetchLiveNasaPower(
  lat: number,
  lon: number,
  startStr: string,
  endStr: string,
  nSteps = 16,
): Promise<Climate> {
  const sClean = startStr.replace(/-/g, "");
  const eClean = endStr.replace(/-/g, "");
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point` +
    `?parameters=TS,T2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,RH2M,PS` +
    `&community=RE&longitude=${lon}&latitude=${lat}` +
    `&start=${sClean}&end=${eClean}&format=JSON`;

  const data = await fetchJson<NasaPowerResponse>(url, {
    timeoutMs: 10000,
    retries: 1,
  });

  const params = data?.properties?.parameter;
  if (!params || !params.TS || typeof params.TS !== "object") {
    throw new Error("Payload inválido do NASA POWER.");
  }

  const tsMap = params.TS;
  const swMap = params.ALLSKY_SFC_SW_DWN ?? {};
  const prMap = params.PRECTOTCORR ?? {};
  const rhMap = params.RH2M ?? {};
  const psMap = params.PS ?? {};

  const allKeys = Object.keys(tsMap).sort();
  const validKeys = allKeys.filter((k) => {
    const val = tsMap[k];
    return typeof val === "number" && Number.isFinite(val) && val !== MISSING_VALUE;
  });

  if (validKeys.length < 4) {
    throw new Error("Janela sem dados consolidados no NASA POWER.");
  }

  const indices = linspaceInt(0, validKeys.length - 1, Math.min(nSteps, validKeys.length));
  const sampledKeys = indices.map((i) => validKeys[i]);

  const dates: string[] = [];
  const ts: number[] = [];
  const sw: number[] = [];
  const precip: number[] = [];
  const rh: number[] = [];
  const ps: number[] = [];

  for (const k of sampledKeys) {
    dates.push(`${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`);
    ts.push(Number(tsMap[k]));

    const swVal = swMap[k] ?? MISSING_VALUE;
    const prVal = prMap[k] ?? MISSING_VALUE;
    const rhVal = rhMap[k] ?? MISSING_VALUE;
    const psVal = psMap[k] ?? MISSING_VALUE;

    sw.push(swVal === MISSING_VALUE || !Number.isFinite(swVal) ? 200.0 : Number(swVal));
    precip.push(prVal === MISSING_VALUE || !Number.isFinite(prVal) ? 0.0 : Number(prVal));
    rh.push(rhVal === MISSING_VALUE || !Number.isFinite(rhVal) ? 65.0 : Number(rhVal));
    ps.push(psVal === MISSING_VALUE || !Number.isFinite(psVal) ? 95.0 : Number(psVal));
  }

  return { dates, ts, sw, precip, rh, ps };
}

/**
 * Ponto de integração oficial (`getClimate`): consulta o NASA POWER com cache LRU (6h)
 * e faz fallback transparente para `syntheticClimate` se indisponível.
 */
export async function getClimate(
  lat: number,
  lon: number,
  start: string,
  end: string,
  n = 16,
): Promise<ClimateResult> {
  const cacheKey = `${buildCacheKey("power", lat, lon, start, end)}:${n}`;
  try {
    const climate = await powerCache.getOrLoad(cacheKey, () =>
      fetchLiveNasaPower(lat, lon, start, end, n),
    );
    return { climate, isReal: true };
  } catch {
    return {
      climate: syntheticClimate(start, end, n),
      isReal: false,
    };
  }
}

export function clearNasaPowerCache(): void {
  powerCache.clear();
}

