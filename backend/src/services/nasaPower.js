import { createCache } from "../utils/cache.js";
import { fetchJson } from "../utils/http.js";
import { AppError } from "../utils/errors.js";
import { mean } from "../utils/math.js";

const POWER_MISSING = -999; // valor sentinela da API para "sem dado"
const PARAMETERS = ["TS", "ALLSKY_SFC_SW_DWN", "PRECTOTCORR"];
const cache = createCache({ ttlMs: 60 * 60 * 1000, maxEntries: 32 });

/**
 * Séries diárias do NASA POWER para um ponto e período.
 *
 * Retorna `{ byDate, means }`:
 *  - `byDate["YYYY-MM-DD"]` -> { ts, sw, precip } (temperatura de superfície °C,
 *    irradiância solar W/m², chuva mm/dia). Parâmetros ausentes ficam `null`.
 *  - `means` -> média de cada parâmetro na janela inteira (referência do modelo).
 */
export function getPowerSeries(lat, lon, startDate, endDate) {
  const key = `${lat.toFixed(3)}|${lon.toFixed(3)}|${startDate}|${endDate}`;
  return cache.getOrLoad(key, () => loadPower(lat, lon, startDate, endDate));
}

async function loadPower(lat, lon, startDate, endDate) {
  const query = new URLSearchParams({
    parameters: PARAMETERS.join(","),
    community: "RE",
    latitude: String(lat),
    longitude: String(lon),
    start: startDate.replaceAll("-", ""),
    end: endDate.replaceAll("-", ""),
    format: "JSON",
  });
  const json = await fetchJson(`https://power.larc.nasa.gov/api/temporal/daily/point?${query}`, {
    service: "NASA POWER",
  });

  const params = json?.properties?.parameter;
  if (!params?.TS) throw new AppError(502, "NASA POWER retornou um formato inesperado.");

  const clean = (v) => (Number.isFinite(v) && v !== POWER_MISSING ? v : null);
  const byDate = {};
  for (const stamp of Object.keys(params.TS)) {
    const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
    byDate[date] = {
      ts: clean(params.TS[stamp]),
      sw: clean(params.ALLSKY_SFC_SW_DWN?.[stamp]),
      precip: clean(params.PRECTOTCORR?.[stamp]),
    };
  }

  const column = (field) => Object.values(byDate).map((d) => d[field]).filter((v) => v !== null);
  if (column("ts").length < 4) {
    throw new AppError(502, "NASA POWER não tem dados consolidados suficientes para o período.");
  }
  return {
    byDate,
    means: { ts: mean(column("ts")), sw: mean(column("sw")), precip: mean(column("precip")) },
  };
}
