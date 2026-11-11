import test from "node:test";
import assert from "node:assert/strict";

import { GRID_SIZE } from "../src/constants.js";
import { classify } from "../src/analysis/classifier.js";
import { analyzePixels } from "../src/analysis/pixels.js";
import { parseAnalysisRequest } from "../src/analysis/request.js";

const cells = GRID_SIZE * GRID_SIZE;

/** Janela sintética: todos os pixels deslocam `mm` na passagem. */
const makeWindow = (mm) => ({
  raw: new Float64Array(cells).fill(mm),
  iono: new Float64Array(cells),
  tropo: new Float64Array(cells),
  tides: new Float64Array(cells),
  coherence: new Float64Array(cells).fill(0.9),
  ionoUncertaintyMm: 0.5,
});

const baseInput = (series) => ({
  lat: -20,
  lon: -44,
  dates: series.map((_, i) => `2026-01-0${i + 1}`),
  windows: series.map(makeWindow),
  expected: series.map(() => 0),
  elevation: Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(100)),
  options: { applyIonosphere: true, applyTroposphere: true, applySolidTides: true, applyNasaPower: true, minCoherence: 0.4 },
});

test("série estável é classificada como GREEN", () => {
  const { metrics } = analyzePixels(baseInput([0, 0.1, 0, 0.1]));
  assert.equal(classify(metrics).code, "GREEN");
});

test("subsidência acelerada é classificada como RED", () => {
  const { metrics } = analyzePixels(baseInput([0, -2, -6, -12, -20]));
  assert.equal(classify(metrics).code, "RED");
});

test("correções habilitadas são subtraídas do bruto", () => {
  const input = baseInput([0, 3]);
  input.windows[1].iono.fill(1);
  input.windows[1].tropo.fill(0.5);
  input.windows[1].tides.fill(0.25);
  const { pixels } = analyzePixels(input);
  assert.equal(pixels[0].compensated_los_mm, 1.25); // 3 - 1 - 0.5 - 0.25
});

test("pixels abaixo da coerência mínima são mascarados; todos mascarados => sem métricas", () => {
  const input = baseInput([0, 1]);
  input.options.minCoherence = 0.95;
  const { pixels, metrics } = analyzePixels(input);
  assert.ok(pixels.every((p) => p.masked));
  assert.equal(metrics, null);
});

test("validação rejeita período invertido e coordenadas ausentes", () => {
  assert.throws(() => parseAnalysisRequest({ start_date: "2026-05-01", end_date: "2026-04-01", custom_lat: 1, custom_lon: 1 }), /posterior/);
  assert.throws(() => parseAnalysisRequest({ start_date: "2026-01-01", end_date: "2026-02-01" }), /custom_lat/);
});

test("scenario_id conhecido resolve as coordenadas sem precisar de custom_*", () => {
  const { target } = parseAnalysisRequest({ scenario_id: "itaipu_normal", start_date: "2026-01-01", end_date: "2026-02-01" });
  assert.equal(target.lat, -25.408);
});
