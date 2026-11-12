import { GRID_SIZE, PIXEL_STEP_DEG } from "@phase-zero/shared";
import { buildCacheKey, CACHE_TTLS, LruCache } from "../lib/cache.js";
import { fetchJson } from "../lib/http.js";
import { zoom2D } from "../lib/interp.js";
import { linspaceInt, mean, nanToNum, roundN } from "../lib/math.js";

interface OpenMeteoElevationResponse {
  elevation?: number[];
}

export interface TerrainGridMeta {
  isFlatFallback: boolean;
  isErrorFallback: boolean;
  realElevSpan: number;
}

const demCache = new LruCache<number[][]>({ ttlMs: CACHE_TTLS.DEM_MS, maxEntries: 64 });
const terrainMetaMap = new WeakMap<number[][], TerrainGridMeta>();

export function getTerrainGridMeta(grid: number[][]): TerrainGridMeta | undefined {
  return terrainMetaMap.get(grid);
}

/**
 * Relevo sintético determinístico (crista gaussiana + rampa de talude + ondulação senoidal).
 */
export function buildSyntheticRelief(gridSize = GRID_SIZE): number[][] {
  const center = (gridSize - 1) / 2.0;
  const relief: number[][] = [];

  for (let r = 0; r < gridSize; r += 1) {
    const row: number[] = [];
    const crestR = 24.0 * Math.exp(-((r - 6.5) ** 2) / 5.0);
    const slopeR = (gridSize - r) * 2.8;
    for (let c = 0; c < gridSize; c += 1) {
      const crest = crestR * Math.exp(-((c - center) ** 2) / 38.0);
      const slope = slopeR + Math.sin(c * 0.45) * 4.0;
      row.push(crest + slope);
    }
    relief.push(row);
  }
  return relief;
}

function addScalarToGrid(
  grid: readonly (readonly number[])[],
  scalar: number,
  scale = 1.0,
): number[][] {
  return grid.map((row) => row.map((v) => scalar + v * scale));
}

export function processCustomElevations25(
  elevations25: readonly number[],
  gridSize = GRID_SIZE,
): number[][] {
  const syntheticRelief = buildSyntheticRelief(gridSize);
  const clean25 = elevations25.map((v) => nanToNum(Number(v), 400.0));
  const matrix5x5: number[][] = [];
  for (let r = 0; r < 5; r += 1) {
    matrix5x5.push(clean25.slice(r * 5, (r + 1) * 5));
  }

  const zoomed = zoom2D(matrix5x5, gridSize / 5.0, 2)
    .slice(0, gridSize)
    .map((row) => row.slice(0, gridSize));

  const flat = zoomed.flat();
  const minVal = Math.min(...flat);
  const maxVal = Math.max(...flat);
  const realElevSpan = maxVal - minVal;

  if (realElevSpan < 6.0) {
    const meanVal = mean(flat);
    const out = addScalarToGrid(syntheticRelief, meanVal, 0.65);
    terrainMetaMap.set(out, {
      isFlatFallback: true,
      isErrorFallback: false,
      realElevSpan,
    });
    return out;
  }
  terrainMetaMap.set(zoomed, {
    isFlatFallback: false,
    isErrorFallback: false,
    realElevSpan,
  });
  return zoomed;
}

/**
 * Porta de `build_3d_terrain_grid` (`R-B3`).
 * - Presets (`!isCustom`): altitude base (195m Itaipu, 18m Maceió, 820m MG) + relevo sintético.
 * - Custom (`isCustom`): consulta 25 pontos no Open-Meteo (timeout 5s, cache 24h),
 *   faz upsample 5×5 → 18×18 com `zoom2D(..., order=2)` e aplica regra de terreno plano (`< 6m`).
 */
export async function getTerrainGrid(
  lat: number,
  lon: number,
  size = GRID_SIZE,
  isCustom = false,
): Promise<number[][]> {
  const syntheticRelief = buildSyntheticRelief(size);

  if (!isCustom) {
    const baseAlt =
      Math.abs(lat - -25.408) < 0.2 ? 195.0 : Math.abs(lat - -9.632) < 0.2 ? 18.0 : 820.0;
    return addScalarToGrid(syntheticRelief, baseAlt, 1.0);
  }

  const cacheKey = `${buildCacheKey("dem", lat, lon)}:${size}`;
  try {
    return await demCache.getOrLoad(cacheKey, async () => {
      const center = (size - 1) / 2.0;
      const sampleIdx = linspaceInt(0, size - 1, 5);
      const lats: number[] = [];
      const lons: number[] = [];

      for (const r of sampleIdx) {
        for (const c of sampleIdx) {
          lats.push(roundN(lat + (r - center) * PIXEL_STEP_DEG, 5));
          lons.push(roundN(lon + (c - center) * PIXEL_STEP_DEG, 5));
        }
      }

      const url =
        `https://api.open-meteo.com/v1/elevation` +
        `?latitude=${lats.join(",")}&longitude=${lons.join(",")}`;

      const resp = await fetchJson<OpenMeteoElevationResponse>(url, {
        timeoutMs: 5000,
        retries: 1,
      });

      if (!Array.isArray(resp?.elevation) || resp.elevation.length < 25) {
        throw new Error("Resposta inválida do Open-Meteo Elevation.");
      }

      return processCustomElevations25(resp.elevation.slice(0, 25), size);
    });
  } catch {
    const fallback = addScalarToGrid(syntheticRelief, 500.0, 1.0);
    terrainMetaMap.set(fallback, {
      isFlatFallback: false,
      isErrorFallback: true,
      realElevSpan: 0,
    });
    return fallback;
  }
}

export function clearTerrainCache(): void {
  demCache.clear();
}

