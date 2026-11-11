import { CMR_SHORT_NAMES, Granule } from "@phase-zero/shared";
import { buildCacheKey, CACHE_TTLS, LruCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";

interface CmrLink {
  href?: string;
  rel?: string;
}

interface CmrEntry {
  title?: string;
  links?: CmrLink[];
}

interface CmrFeedResponse {
  feed?: {
    entry?: CmrEntry[];
  };
}

const cmrCache = new LruCache<Granule[]>({ ttlMs: CACHE_TTLS.CMR_MS, maxEntries: 64 });

/**
 * Busca granules no NASA CMR (`search_nasa_cmr_granules`, `R-B4`).
 * Consulta as 4 coleções oficiais (NISAR GUNW Provisional/Beta, OPERA DISP-S1, ARIA S1),
 * filtra links `https://` terminados em `.h5` ou `.nc` que não sejam OPeNDAP.
 * Em caso de falha, loga warning e retorna `[]`.
 */
export async function searchGranules(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<Granule[]> {
  const cacheKey = buildCacheKey("cmr", lat, lon, start, end);

  try {
    return await cmrCache.getOrLoad(cacheKey, async () => {
      const params = new URLSearchParams();
      params.set("point", `${lon},${lat}`);
      params.set("temporal", `${start}T00:00:00Z,${end}T23:59:59Z`);
      for (const shortName of CMR_SHORT_NAMES) {
        params.append("short_name[]", shortName);
      }
      params.set("page_size", "20");
      params.set("sort_key", "start_date");

      const url = `https://cmr.earthdata.nasa.gov/search/granules.json?${params.toString()}`;
      const data = await fetchJson<CmrFeedResponse>(url, {
        timeoutMs: 8000,
        retries: 1,
      });

      const entries = data?.feed?.entry ?? [];
      const granules: Granule[] = [];

      for (const entry of entries) {
        const links = entry.links ?? [];
        const h5Links = links
          .map((lnk) => ({
            href: lnk.href ?? "",
            rel: (lnk.rel ?? "").toUpperCase(),
          }))
          .filter(
            (lnk) =>
              lnk.href.startsWith("https://") &&
              (lnk.href.endsWith(".h5") || lnk.href.endsWith(".nc")) &&
              !lnk.rel.includes("OPENDAP"),
          )
          .map((lnk) => lnk.href);

        if (h5Links.length > 0) {
          granules.push({
            title: entry.title ?? "NASA_GRANULE",
            h5_url: h5Links[0],
          });
        }
      }

      return granules;
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[cmr] Falha ao consultar NASA CMR: ${msg}`);
    return [];
  }
}

export function clearCmrCache(): void {
  cmrCache.clear();
}

