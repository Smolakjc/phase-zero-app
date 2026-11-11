import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import h5wasm from "h5wasm/node";
import {
  GRID_SIZE,
  H5SliceResult,
  LAMBDA_NISAR_L_MM,
  LAMBDA_SENTINEL_C_MM,
} from "@phase-zero/shared";
import { toProjected } from "../lib/geo.js";
import { argminAbs, clip, nanToNum } from "../lib/math.js";

const MAX_REDIRECTS = 5;
const DEFAULT_MAX_GRANULE_MB = 600;
const DOWNLOAD_TIMEOUT_MS = 30000;

export interface StreamH5Options {
  maxGranuleMb?: number;
  timeoutMs?: number;
}

interface H5DatasetLike {
  shape: number[];
  value: unknown;
  attrs: Record<string, { value: unknown } | undefined>;
  slice(ranges: number[][]): unknown;
}

interface H5GroupOrFileLike {
  keys(): string[];
  get(path: string): H5DatasetLike | H5GroupOrFileLike | null;
}

function isDataset(entity: unknown): entity is H5DatasetLike {
  return (
    typeof entity === "object" &&
    entity !== null &&
    "shape" in entity &&
    "slice" in entity &&
    typeof (entity as H5DatasetLike).slice === "function"
  );
}

function isGroup(entity: unknown): entity is H5GroupOrFileLike {
  return (
    typeof entity === "object" &&
    entity !== null &&
    "keys" in entity &&
    typeof (entity as H5GroupOrFileLike).keys === "function"
  );
}

function toNumberArray(val: unknown): number[] {
  if (Array.isArray(val)) {
    return val.map((v) => Number(v));
  }
  if (ArrayBuffer.isView(val)) {
    const arr = val as unknown as ArrayLike<number>;
    const out = new Array<number>(arr.length);
    for (let i = 0; i < arr.length; i += 1) {
      out[i] = Number(arr[i]);
    }
    return out;
  }
  if (typeof val === "number" || typeof val === "bigint") {
    return [Number(val)];
  }
  return [];
}

function reshape2D(flat: readonly number[], rows: number, cols: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row = new Array<number>(cols);
    for (let c = 0; c < cols; c += 1) {
      row[c] = flat[r * cols + c] ?? 0;
    }
    out.push(row);
  }
  return out;
}

async function downloadH5WithBearer(
  url: string,
  token: string,
  destPath: string,
  options: StreamH5Options = {},
): Promise<void> {
  const maxMb = options.maxGranuleMb ?? DEFAULT_MAX_GRANULE_MB;
  const timeoutMs = options.timeoutMs ?? DOWNLOAD_TIMEOUT_MS;
  const cleanToken = token.trim();
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    const isS3Presigned =
      currentUrl.includes("X-Amz-Signature=") || currentUrl.includes("X-Amz-Credential=");
    const headers: Record<string, string> = isS3Presigned
      ? {}
      : { Authorization: `Bearer ${cleanToken}` };
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.name : "NetworkError";
      throw new Error(`Falha de rede ao conectar ao Earthdata Cloud (${reason}).`);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirecionamento sem destino no Earthdata Cloud.");
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Não autorizado pelo NASA Earthdata (HTTP 401/403). Verifique o token.");
    }

    if (!response.ok || !response.body) {
      throw new Error(`Falha ao baixar granule HDF5 (HTTP ${response.status}).`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const sizeMb = contentLength / (1024 * 1024);
    if (sizeMb > maxMb) {
      throw new Error(`Granule excede o limite de tamanho permitido (${Math.round(sizeMb)} MB > ${maxMb} MB).`);
    }

    const webStream = response.body as unknown as NodeWebReadableStream;
    await pipeline(Readable.fromWeb(webStream), fs.createWriteStream(destPath));
    return;
  }

  throw new Error("Limite máximo de redirecionamentos excedido no Earthdata Cloud.");
}

/**
 * Extrai a janela `size × size` de um arquivo HDF5 local já aberto pelo `h5wasm`.
 * Suporta as estruturas:
 * 1. **NISAR L2 GUNW** (`/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram`)
 * 2. **OPERA L3 DISP-S1** (`displacement`, `temporal_coherence`)
 */
export async function extractH5SliceFromFile(
  filePath: string,
  lat: number,
  lon: number,
  size = GRID_SIZE,
): Promise<H5SliceResult> {
  await h5wasm.ready;
  const f = new h5wasm.File(filePath, "r");
  const half = Math.floor(size / 2);

  try {
    const rootKeys = f.keys();
    const gunwGroup = f.get("science/LSAR/GUNW");

    if (gunwGroup && isGroup(gunwGroup)) {
      const gBase = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram";
      const hh = `${gBase}/HH`;

      const xDs = f.get(`${gBase}/xCoordinates`);
      const yDs = f.get(`${gBase}/yCoordinates`);
      const projDs = f.get(`${gBase}/projection`);
      const phaseDs = f.get(`${hh}/unwrappedPhase`);
      const cohDs = f.get(`${hh}/coherenceMagnitude`);

      if (!isDataset(xDs) || !isDataset(yDs) || !isDataset(projDs) || !isDataset(phaseDs) || !isDataset(cohDs)) {
        throw new Error("Datasets obrigatórios do NISAR GUNW ausentes.");
      }

      const xCoords = toNumberArray(xDs.value);
      const yCoords = toNumberArray(yDs.value);
      const epsgArr = toNumberArray(projDs.value);
      const epsg = Math.trunc(epsgArr[0] ?? 32723);

      const { x: targetX, y: targetY } = toProjected(lat, lon, epsg);
      const colIdx = argminAbs(xCoords, targetX);
      const rowIdx = argminAbs(yCoords, targetY);

      const r0 = Math.max(0, Math.min(yCoords.length - size, rowIdx - half));
      const c0 = Math.max(0, Math.min(xCoords.length - size, colIdx - half));
      const actualRows = Math.min(size, yCoords.length - r0);
      const actualCols = Math.min(size, xCoords.length - c0);

      const phaseFlat = toNumberArray(
        phaseDs.slice([
          [r0, r0 + actualRows],
          [c0, c0 + actualCols],
        ]),
      );
      const cohFlat = toNumberArray(
        cohDs.slice([
          [r0, r0 + actualRows],
          [c0, c0 + actualCols],
        ]),
      );

      const conv = -LAMBDA_NISAR_L_MM / (4.0 * Math.PI);
      const rawMmFlat = phaseFlat.map((v) => {
        const clean = nanToNum(v, 0.0) * conv;
        return Object.is(clean, -0) ? 0 : clean;
      });
      const cohCleanFlat = cohFlat.map((v) => clip(nanToNum(v, 0.5), 0.05, 0.99));

      return {
        rawMmGrid: reshape2D(rawMmFlat, actualRows, actualCols),
        coherenceGrid: reshape2D(cohCleanFlat, actualRows, actualCols),
        wavelengthMm: LAMBDA_NISAR_L_MM,
      };
    }

    if (rootKeys.includes("displacement")) {
      const xDs = f.get("x");
      const yDs = f.get("y");
      const spatialRef = f.get("spatial_ref");
      const dispDs = f.get("displacement");
      const cohDs = f.get("temporal_coherence");

      if (!isDataset(xDs) || !isDataset(yDs) || !isDataset(dispDs) || !isDataset(cohDs)) {
        throw new Error("Datasets obrigatórios do OPERA DISP ausentes.");
      }

      const xCoords = toNumberArray(xDs.value);
      const yCoords = toNumberArray(yDs.value);
      let epsg = 32723;
      if (isDataset(spatialRef) && spatialRef.attrs?.epsg_code) {
        const attrVal = toNumberArray(spatialRef.attrs.epsg_code.value);
        if (attrVal.length > 0 && Number.isFinite(attrVal[0])) {
          epsg = Math.trunc(attrVal[0]);
        }
      }

      const { x: targetX, y: targetY } = toProjected(lat, lon, epsg);
      const colIdx = argminAbs(xCoords, targetX);
      const rowIdx = argminAbs(yCoords, targetY);

      const r0 = Math.max(0, Math.min(yCoords.length - size, rowIdx - half));
      const c0 = Math.max(0, Math.min(xCoords.length - size, colIdx - half));
      const actualRows = Math.min(size, yCoords.length - r0);
      const actualCols = Math.min(size, xCoords.length - c0);

      const dispFlat = toNumberArray(
        dispDs.slice([
          [r0, r0 + actualRows],
          [c0, c0 + actualCols],
        ]),
      );
      const cohFlat = toNumberArray(
        cohDs.slice([
          [r0, r0 + actualRows],
          [c0, c0 + actualCols],
        ]),
      );

      const rawMmFlat = dispFlat.map((v) => {
        const clean = nanToNum(v, 0.0) * 1000.0;
        return Object.is(clean, -0) ? 0 : clean;
      });
      const cohCleanFlat = cohFlat.map((v) => clip(nanToNum(v, 0.5), 0.05, 0.99));

      return {
        rawMmGrid: reshape2D(rawMmFlat, actualRows, actualCols),
        coherenceGrid: reshape2D(cohCleanFlat, actualRows, actualCols),
        wavelengthMm: LAMBDA_SENTINEL_C_MM,
      };
    }

    throw new Error("Estrutura HDF5 não suportada.");
  } finally {
    f.close();
  }
}

/**
 * Ponto de integração oficial (`streamH5Slice`, `K-B3` / Seção 6).
 * Se `url` for um caminho de arquivo local existente (ex.: em testes de integração `K-B5`),
 * lê diretamente do disco; caso contrário faz download autenticado com Bearer token para
 * arquivo temporário e remove no `finally`. Nunca expõe o token em logs ou erros.
 */
export async function streamH5Slice(
  url: string,
  token: string,
  lat: number,
  lon: number,
  size = GRID_SIZE,
  options: StreamH5Options = {},
): Promise<H5SliceResult> {
  if (!url.startsWith("http://") && !url.startsWith("https://") && fs.existsSync(url)) {
    return extractH5SliceFromFile(url, lat, lon, size);
  }

  const tmpFile = path.join(
    os.tmpdir(),
    `phasezero-h5-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.h5`,
  );

  try {
    await downloadH5WithBearer(url, token, tmpFile, options);
    return await extractH5SliceFromFile(tmpFile, lat, lon, size);
  } finally {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Ignora erro de limpeza de arquivo temporário
    }
  }
}

