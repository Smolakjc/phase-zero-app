import { GRID_SIZE, PIXEL_STEP_DEG } from "../constants.js";
import { createCache } from "../utils/cache.js";
import { fetchJson } from "../utils/http.js";

const SAMPLES = 5; // a API é consultada numa malha 5x5 e depois interpolada
const cache = createCache({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 64 });

/**
 * Elevação (m) de uma grade GRID_SIZE x GRID_SIZE centrada em (lat, lon),
 * obtida do Open-Meteo (DEM) e interpolada bilinearmente.
 *
 * Retorna `{ grid, ok }` onde `grid[row][col]` é a elevação. Se o serviço
 * falhar, a análise continua com terreno plano (0 m) e `ok = false`:
 * a elevação só serve para a visualização 3D, não afeta a classificação.
 */
export function getElevationGrid(lat, lon) {
  const key = `${lat.toFixed(4)}|${lon.toFixed(4)}`;
  return cache.getOrLoad(key, () => loadElevation(lat, lon)).catch(() => ({
    grid: Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0)),
    ok: false,
  }));
}

async function loadElevation(lat, lon) {
  const center = (GRID_SIZE - 1) / 2;
  const lats = [];
  const lons = [];
  for (let r = 0; r < SAMPLES; r += 1) {
    for (let c = 0; c < SAMPLES; c += 1) {
      const row = (r / (SAMPLES - 1)) * (GRID_SIZE - 1);
      const col = (c / (SAMPLES - 1)) * (GRID_SIZE - 1);
      lats.push((lat + (row - center) * PIXEL_STEP_DEG).toFixed(5));
      lons.push((lon + (col - center) * PIXEL_STEP_DEG).toFixed(5));
    }
  }

  const json = await fetchJson(
    `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`,
    { service: "Open-Meteo Elevation" },
  );
  const flat = json.elevation;
  if (!Array.isArray(flat) || flat.length !== SAMPLES * SAMPLES) {
    throw new Error("Resposta de elevação inválida.");
  }

  const coarse = (r, c) => Number(flat[r * SAMPLES + c]);
  const grid = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const line = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      line.push(bilinear(coarse, (row / (GRID_SIZE - 1)) * (SAMPLES - 1), (col / (GRID_SIZE - 1)) * (SAMPLES - 1)));
    }
    grid.push(line);
  }
  return { grid, ok: true };
}

/** Interpolação bilinear em coordenadas fracionárias da malha grossa. */
function bilinear(sample, r, c) {
  const r0 = Math.min(Math.floor(r), SAMPLES - 2);
  const c0 = Math.min(Math.floor(c), SAMPLES - 2);
  const fr = r - r0;
  const fc = c - c0;
  return (
    sample(r0, c0) * (1 - fr) * (1 - fc) +
    sample(r0 + 1, c0) * fr * (1 - fc) +
    sample(r0, c0 + 1) * (1 - fr) * fc +
    sample(r0 + 1, c0 + 1) * fr * fc
  );
}
