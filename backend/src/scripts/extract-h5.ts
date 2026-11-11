#!/usr/bin/env node
/**
 * CLI extratora de HDF5 (`K-B4`): porta de `hdf5_extractor.py` para TypeScript.
 *
 * Uso:
 *   npm run extract -- <entrada.h5> <saida.json>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import h5wasm from "h5wasm/node";
import { LAMBDA_NISAR_L_MM, LosVector } from "@phase-zero/shared";
import { bilinear2D } from "../lib/interp.js";
import { mean, nanToNum, roundN } from "../lib/math.js";

const PHASE_TO_MM = -LAMBDA_NISAR_L_MM / (4.0 * Math.PI);

export interface ExtractedH5Payload {
  los_vector: LosVector;
  raw_los_mm: number[][];
  iono_mm: number[][];
  tropo_mm: number[][];
  tides_mm: number[][];
  coherence: number[][];
  connected_components: number[][];
  iono_uncertainty_rad: number[][];
}

interface H5DatasetLike {
  shape: number[];
  value: unknown;
  slice(ranges: number[][]): unknown;
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

function toNumbers(val: unknown): number[] {
  if (Array.isArray(val)) return val.map((v) => Number(v));
  if (ArrayBuffer.isView(val)) {
    const view = val as unknown as ArrayLike<number>;
    const out = new Array<number>(view.length);
    for (let i = 0; i < view.length; i += 1) {
      out[i] = Number(view[i]);
    }
    return out;
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

function read3DLayer0(ds: H5DatasetLike): { matrix: number[][]; flat: number[] } {
  const shape = ds.shape;
  if (shape.length === 3) {
    const [, rows, cols] = shape;
    const flat = toNumbers(
      ds.slice([
        [0, 1],
        [0, rows],
        [0, cols],
      ]),
    );
    return { matrix: reshape2D(flat, rows, cols), flat };
  }
  const [rows, cols] = shape;
  const flat = toNumbers(ds.value);
  return { matrix: reshape2D(flat, rows, cols), flat };
}

export async function convertNisarH5ToCache(
  h5Filepath: string,
  outputJsonPath?: string,
): Promise<ExtractedH5Payload> {
  await h5wasm.ready;
  const gridBase = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram";
  const hhBase = `${gridBase}/HH`;
  const metaGrid = "/science/LSAR/GUNW/metadata/radarGrid";

  const f = new h5wasm.File(h5Filepath, "r");
  try {
    const getDs = (p: string): H5DatasetLike => {
      const entity = f.get(p);
      if (!isDataset(entity)) {
        throw new Error(`Dataset obrigatório não encontrado em ${p}`);
      }
      return entity;
    };

    const xCoords = toNumbers(getDs(`${gridBase}/xCoordinates`).value);
    const yCoords = toNumbers(getDs(`${gridBase}/yCoordinates`).value);

    const unwDs = getDs(`${hhBase}/unwrappedPhase`);
    const [ny, nx] = unwDs.shape;
    const unwPhaseFlat = toNumbers(unwDs.value);
    const coherenceFlat = toNumbers(getDs(`${hhBase}/coherenceMagnitude`).value);
    const connCompFlat = toNumbers(getDs(`${hhBase}/connectedComponents`).value);
    const ionoScreenFlat = toNumbers(getDs(`${hhBase}/ionospherePhaseScreen`).value);
    const ionoUncertFlat = toNumbers(getDs(`${hhBase}/ionospherePhaseScreenUncertainty`).value);

    const rx = toNumbers(getDs(`${metaGrid}/xCoordinates`).value);
    const ry = toNumbers(getDs(`${metaGrid}/yCoordinates`).value);

    const wetTropo = read3DLayer0(getDs(`${metaGrid}/wetTroposphericPhaseScreen`)).matrix;
    const hydroTropo = read3DLayer0(getDs(`${metaGrid}/hydrostaticTroposphericPhaseScreen`)).matrix;
    const solidTides = read3DLayer0(getDs(`${metaGrid}/solidEarthTidesPhase`)).matrix;

    const losX = mean(read3DLayer0(getDs(`${metaGrid}/losUnitVectorX`)).flat);
    const losY = mean(read3DLayer0(getDs(`${metaGrid}/losUnitVectorY`)).flat);
    const incAngle = mean(read3DLayer0(getDs(`${metaGrid}/incidenceAngle`)).flat);
    const elevAngle = mean(read3DLayer0(getDs(`${metaGrid}/elevationAngle`)).flat);

    const queryPts: [number, number][] = [];
    for (let r = 0; r < ny; r += 1) {
      for (let c = 0; c < nx; c += 1) {
        queryPts.push([yCoords[r], xCoords[c]]);
      }
    }

    const interpWet = bilinear2D(ry, rx, wetTropo, queryPts, 0.0);
    const interpHydro = bilinear2D(ry, rx, hydroTropo, queryPts, 0.0);
    const interpTides = bilinear2D(ry, rx, solidTides, queryPts, 0.0);

    const cleanMul = (v: number, factor: number): number => {
      const res = nanToNum(v, 0.0) * factor;
      return Object.is(res, -0) ? 0 : res;
    };

    const rawLosMmFlat = unwPhaseFlat.map((v) => cleanMul(v, PHASE_TO_MM));
    const ionoMmFlat = ionoScreenFlat.map((v) => cleanMul(v, PHASE_TO_MM));
    const tropoMmFlat = interpWet.map((w, i) => cleanMul(w + interpHydro[i], PHASE_TO_MM));
    const tidesMmFlat = interpTides.map((t) => cleanMul(t, PHASE_TO_MM));
    const coherenceCleanFlat = coherenceFlat.map((v) => nanToNum(v, 0.0));
    const connCompIntFlat = connCompFlat.map((v) => Math.trunc(nanToNum(v, 0)));
    const ionoUncertCleanFlat = ionoUncertFlat.map((v) => nanToNum(v, 0.0));

    const payload: ExtractedH5Payload = {
      los_vector: {
        losUnitVectorX: roundN(losX, 4),
        losUnitVectorY: roundN(losY, 4),
        incidenceAngle: roundN(incAngle, 2),
        elevationAngle: roundN(elevAngle, 2),
      },
      raw_los_mm: reshape2D(rawLosMmFlat, ny, nx),
      iono_mm: reshape2D(ionoMmFlat, ny, nx),
      tropo_mm: reshape2D(tropoMmFlat, ny, nx),
      tides_mm: reshape2D(tidesMmFlat, ny, nx),
      coherence: reshape2D(coherenceCleanFlat, ny, nx),
      connected_components: reshape2D(connCompIntFlat, ny, nx),
      iono_uncertainty_rad: reshape2D(ionoUncertCleanFlat, ny, nx),
    };

    if (outputJsonPath) {
      fs.mkdirSync(path.dirname(path.resolve(outputJsonPath)), { recursive: true });
      fs.writeFileSync(outputJsonPath, JSON.stringify(payload, null, 2), "utf-8");
    }

    return payload;
  } finally {
    f.close();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const [inputH5, outputJson] = process.argv.slice(2);
  if (!inputH5 || !outputJson) {
    console.error("Uso: npm run extract -- <entrada.h5> <saida.json>");
    process.exit(1);
  }
  convertNisarH5ToCache(inputH5, outputJson)
    .then(() => {
      console.log(`Extração concluída: ${outputJson}`);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Erro ao extrair HDF5: ${msg}`);
      process.exit(1);
    });
}

