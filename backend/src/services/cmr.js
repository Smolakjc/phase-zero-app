import { NISAR_COLLECTIONS } from "../constants.js";
import { config } from "../config.js";
import { createCache } from "../utils/cache.js";
import { fetchJson } from "../utils/http.js";

const CMR_URL = "https://cmr.earthdata.nasa.gov/search/granules.json";
const cache = createCache({ ttlMs: 30 * 60 * 1000, maxEntries: 32 });

/**
 * Busca no CMR os granules NISAR GUNW que cobrem o ponto no período.
 *
 * Retorna uma lista ordenada por data, já reduzida a no máximo
 * `config.maxGranules` itens espaçados uniformemente no período
 * (cada granule é um download grande).
 * Formato: `{ title, url, date }` com `date` = fim da aquisição (YYYY-MM-DD).
 */
export function findGranules(lat, lon, startDate, endDate) {
  const key = `${lat.toFixed(4)}|${lon.toFixed(4)}|${startDate}|${endDate}`;
  return cache.getOrLoad(key, () => loadGranules(lat, lon, startDate, endDate));
}

async function loadGranules(lat, lon, startDate, endDate) {
  const query = new URLSearchParams({
    point: `${lon},${lat}`,
    temporal: `${startDate}T00:00:00Z,${endDate}T23:59:59Z`,
    page_size: "100",
    sort_key: "start_date",
  });
  for (const name of NISAR_COLLECTIONS) query.append("short_name[]", name);

  const json = await fetchJson(`${CMR_URL}?${query}`, { service: "NASA CMR" });

  const granules = [];
  for (const entry of json?.feed?.entry ?? []) {
    const link = (entry.links ?? []).find(
      (l) =>
        l.href?.startsWith("https://") &&
        l.href.endsWith(".h5") &&
        !/opendap/i.test(l.rel ?? "") &&
        !/s3:/i.test(l.href),
    );
    if (!link) continue;
    granules.push({
      title: entry.title ?? link.href.split("/").pop(),
      url: link.href,
      date: String(entry.time_end ?? entry.time_start ?? "").slice(0, 10),
    });
  }

  const valid = granules.filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g.date));
  valid.sort((a, b) => a.date.localeCompare(b.date));
  return pickEvenly(valid, config.maxGranules);
}

/** Escolhe `count` itens espaçados uniformemente, sempre incluindo o primeiro e o último. */
function pickEvenly(items, count) {
  if (items.length <= count) return items;
  const picked = new Set();
  for (let i = 0; i < count; i += 1) {
    picked.add(Math.round((i * (items.length - 1)) / (count - 1)));
  }
  return [...picked].map((i) => items[i]);
}
