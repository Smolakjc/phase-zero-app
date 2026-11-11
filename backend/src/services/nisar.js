import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import h5wasm from "h5wasm/node";
import proj4 from "proj4";

import { GRID_SIZE, PHASE_TO_MM } from "../constants.js";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";
import { createCache } from "../utils/cache.js";
import { clamp, median, nearestIndex } from "../utils/math.js";

// Caminhos padrão de um produto NISAR L2 GUNW.
const GRID = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram";
const HH = `${GRID}/HH`;
const RADAR = "/science/LSAR/GUNW/metadata/radarGrid";

const MAX_REDIRECTS = 5;
const cache = createCache({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 64 });

/**
 * Lê de um granule NISAR GUNW a janela GRID_SIZE x GRID_SIZE ao redor de (lat, lon).
 *
 * O resultado é cacheado: o arquivo é baixado, lido e apagado uma única vez
 * por (granule, ponto), mesmo que a análise seja refeita várias vezes.
 *
 * Retorna deslocamentos em mm na linha de visada, já relativos à mediana da
 * janela (a fase desenrolada tem offset arbitrário, só diferenças importam):
 *  { raw, iono, tropo, tides, coherence, ionoUncertaintyMm, los }
 * Cada camada é um Float64Array de GRID_SIZE*GRID_SIZE (ordem row-major).
 */
export function readGranuleWindow(granule, lat, lon, token) {
  const key = `${granule.url}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
  return cache.getOrLoad(key, () => downloadAndExtract(granule, lat, lon, token));
}

async function downloadAndExtract(granule, lat, lon, token) {
  const tmpFile = path.join(os.tmpdir(), `phasezero-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.h5`);
  try {
    await downloadWithAuth(granule.url, token, tmpFile);
    await h5wasm.ready;
    return extractWindow(tmpFile, lat, lon);
  } finally {
    fs.rm(tmpFile, { force: true }, () => {});
  }
}

/**
 * Download com Bearer token. O Earthdata redireciona entre domínios e o
 * `fetch` descarta o header Authorization nesse caso, então seguimos os
 * redirects manualmente mantendo o token.
 */
async function downloadWithAuth(url, token, destination) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new AppError(502, "Redirecionamento inválido do Earthdata.");
      current = new URL(next, current).toString();
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new AppError(401, "Token Earthdata inválido, expirado ou sem acesso a este produto.");
    }
    if (!response.ok || !response.body) {
      throw new AppError(502, `Falha ao baixar granule NISAR (HTTP ${response.status}).`);
    }

    const sizeMb = Number(response.headers.get("content-length") ?? 0) / 1024 / 1024;
    if (sizeMb > config.maxGranuleMb) {
      throw new AppError(413, `Granule de ${Math.round(sizeMb)} MB excede o limite de ${config.maxGranuleMb} MB.`);
    }
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
    return;
  }
  throw new AppError(502, "Redirecionamentos demais ao baixar o granule.");
}

function extractWindow(file, lat, lon) {
  const f = new h5wasm.File(file, "r");
  try {
    const dataset = (p) => {
      const d = f.get(p);
      if (!d) throw new AppError(422, `Granule sem o dataset obrigatório ${p}.`);
      return d;
    };

    // --- Geolocalização: lat/lon -> projeção nativa do granule -> pixel ---
    const xs = dataset(`${GRID}/xCoordinates`).value;
    const ys = dataset(`${GRID}/yCoordinates`).value;
    const epsg = Number(dataset(`${GRID}/projection`).value);
    const [px, py] = toProjection(epsg)(lon, lat);

    const col = nearestIndex(xs, px);
    const row = nearestIndex(ys, py);
    const insideX = px >= Math.min(xs[0], xs[xs.length - 1]) && px <= Math.max(xs[0], xs[xs.length - 1]);
    const insideY = py >= Math.min(ys[0], ys[ys.length - 1]) && py <= Math.max(ys[0], ys[ys.length - 1]);
    if (!insideX || !insideY) throw new AppError(422, "O ponto está fora da cobertura do granule.");

    const r0 = clamp(row - GRID_SIZE / 2, 0, Math.max(0, ys.length - GRID_SIZE));
    const c0 = clamp(col - GRID_SIZE / 2, 0, Math.max(0, xs.length - GRID_SIZE));
    const window = [
      [r0, r0 + GRID_SIZE],
      [c0, c0 + GRID_SIZE],
    ];

    // Lê uma camada 2D da janela; camadas opcionais ausentes viram `null`.
    const readLayer = (p) => {
      const d = f.get(p);
      return d ? Float64Array.from(d.slice(window)) : null;
    };

    const phase = Float64Array.from(dataset(`${HH}/unwrappedPhase`).slice(window));
    const coherence = Float64Array.from(dataset(`${HH}/coherenceMagnitude`).slice(window));
    const ionoScreen = readLayer(`${HH}/ionospherePhaseScreen`);
    const ionoUncert = readLayer(`${HH}/ionospherePhaseScreenUncertainty`);

    // --- Camadas de correção em grade mais grossa (radarGrid) ---
    const radar = readRadarGrid(f, xs, ys, r0, c0);

    return {
      raw: toRelativeMm(phase),
      iono: ionoScreen ? toRelativeMm(ionoScreen) : new Float64Array(GRID_SIZE * GRID_SIZE),
      tropo: radar.tropo,
      tides: radar.tides,
      coherence: coherence.map((v) => (Number.isFinite(v) ? clamp(v, 0, 1) : 0)),
      ionoUncertaintyMm: ionoUncert ? Math.abs(median(ionoUncert) * PHASE_TO_MM) : 0,
      los: radar.los,
    };
  } finally {
    f.close();
  }
}

/**
 * Lê troposfera (úmida + hidrostática), marés sólidas e vetor LOS da grade de
 * radar (resolução menor) e reamostra para cada pixel da janela por vizinho
 * mais próximo.
 */
function readRadarGrid(f, xs, ys, r0, c0) {
  const zeros = () => new Float64Array(GRID_SIZE * GRID_SIZE);
  const rx = f.get(`${RADAR}/xCoordinates`)?.value;
  const ry = f.get(`${RADAR}/yCoordinates`)?.value;
  const losX = readFirstLevel(f, `${RADAR}/losUnitVectorX`);
  const losY = readFirstLevel(f, `${RADAR}/losUnitVectorY`);
  const incidence = readFirstLevel(f, `${RADAR}/incidenceAngle`);
  const elevation = readFirstLevel(f, `${RADAR}/elevationAngle`);

  const los = {
    losUnitVectorX: round4(median(losX?.values ?? [])),
    losUnitVectorY: round4(median(losY?.values ?? [])),
    incidenceAngle: round4(median(incidence?.values ?? [])),
    elevationAngle: round4(median(elevation?.values ?? [])),
  };
  if (!rx || !ry) return { tropo: zeros(), tides: zeros(), los };

  const wet = readFirstLevel(f, `${RADAR}/wetTroposphericPhaseScreen`);
  const hydro = readFirstLevel(f, `${RADAR}/hydrostaticTroposphericPhaseScreen`);
  const tides = readFirstLevel(f, `${RADAR}/solidEarthTidesPhase`);

  // Para cada linha/coluna da janela, qual índice da grade de radar usar.
  const rowMap = Array.from({ length: GRID_SIZE }, (_, r) => nearestIndex(ry, ys[r0 + r]));
  const colMap = Array.from({ length: GRID_SIZE }, (_, c) => nearestIndex(rx, xs[c0 + c]));

  const resample = (layer, extra) => {
    const out = zeros();
    if (!layer) return out;
    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const v = layer.values[rowMap[r] * layer.cols + colMap[c]];
        const w = extra ? extra.values[rowMap[r] * extra.cols + colMap[c]] : 0;
        out[r * GRID_SIZE + c] = (Number.isFinite(v) ? v : 0) + (Number.isFinite(w) ? w : 0);
      }
    }
    return toRelativeMm(out);
  };

  return { tropo: resample(wet, hydro), tides: resample(tides), los };
}

/** Lê o primeiro nível (índice 0 de altura) de um dataset 3D [altura, y, x]. */
function readFirstLevel(f, p) {
  const d = f.get(p);
  if (!d) return null;
  const shape = d.shape;
  if (shape.length === 3) {
    const [, rows, cols] = shape;
    return { values: Float64Array.from(d.slice([[0, 1], [0, rows], [0, cols]])), cols };
  }
  if (shape.length === 2) return { values: Float64Array.from(d.value), cols: shape[1] };
  return null;
}

/** Fase (rad) -> mm, removendo o offset arbitrário (mediana da janela). NaN vira 0. */
function toRelativeMm(phase) {
  const offset = median(phase);
  return phase.map((v) => (Number.isFinite(v) ? (v - offset) * PHASE_TO_MM : 0));
}

const round4 = (v) => Math.round(v * 1e4) / 1e4;

/** Função (lon, lat) -> (x, y) na projeção EPSG do granule (UTM ou definição conhecida do proj4). */
function toProjection(epsg) {
  let definition;
  if (epsg >= 32601 && epsg <= 32660) definition = `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`;
  else if (epsg >= 32701 && epsg <= 32760) definition = `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`;
  else if (epsg === 4326) definition = "EPSG:4326";
  else throw new AppError(422, `Projeção EPSG:${epsg} do granule não é suportada.`);
  const converter = proj4("EPSG:4326", definition);
  return (lon, lat) => converter.forward([lon, lat]);
}
