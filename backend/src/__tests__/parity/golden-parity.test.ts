import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AnalysisRequestInput, AnalysisResponse } from "@phase-zero/shared";
import { buildApp } from "../../app.js";
import { syntheticClimate } from "../../services/nasaPower.js";
import { runPhaseZeroPipeline } from "../../services/pipeline.js";
import { getTerrainGrid, processCustomElevations25 } from "../../services/terrain.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goldenDir = path.join(__dirname, "..", "fixtures", "golden");

interface GoldenFixture {
  request: AnalysisRequestInput;
  response: AnalysisResponse;
  mock_elevations_25?: number[];
  mock_granules?: { title: string; h5_url: string }[];
}

function assertNumericParity(actual: AnalysisResponse, expected: AnalysisResponse, baseTol = 0.01): void {
  const tol = baseTol + 1e-9; // Compensação para representação IEEE-754 de 0.01 (ex: 0.010000000000000009)
  expect(actual.scenario_meta).toEqual(expected.scenario_meta);
  expect(actual.status.code).toBe(expected.status.code);
  expect(actual.status.label).toBe(expected.status.label);
  expect(actual.status.description).toBe(expected.status.description);

  expect(
    Math.abs(actual.status.residual_trend_mm_per_pass - expected.status.residual_trend_mm_per_pass),
  ).toBeLessThanOrEqual(tol);
  expect(
    Math.abs(actual.status.acceleration_index_mm - expected.status.acceleration_index_mm),
  ).toBeLessThanOrEqual(tol);
  expect(
    Math.abs(actual.status.max_weighted_anomaly_score - expected.status.max_weighted_anomaly_score),
  ).toBeLessThanOrEqual(tol);

  expect(actual.dates).toEqual(expected.dates);
  expect(actual.disclaimer).toBe(expected.disclaimer);
  expect(actual.grid_pixels.length).toBe(expected.grid_pixels.length);

  for (let i = 0; i < expected.grid_pixels.length; i += 1) {
    const ap = actual.grid_pixels[i];
    const ep = expected.grid_pixels[i];
    expect(ap.id).toBe(ep.id);
    expect(ap.zone).toBe(ep.zone);
    expect(ap.masked).toBe(ep.masked);
    expect(Math.abs(ap.lat - ep.lat)).toBeLessThanOrEqual(1e-5);
    expect(Math.abs(ap.lon - ep.lon)).toBeLessThanOrEqual(1e-5);
    expect(Math.abs(ap.elevation_m - ep.elevation_m)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ap.coherence - ep.coherence)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ap.compensated_los_mm - ep.compensated_los_mm)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ap.residual_mm - ep.residual_mm)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ap.anomaly_score - ep.anomaly_score)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ap.iono_uncertainty_mm - ep.iono_uncertainty_mm)).toBeLessThanOrEqual(tol);

    for (let t = 0; t < ep.pixel_time_series.observed_raw_mm.length; t += 1) {
      expect(
        Math.abs(
          ap.pixel_time_series.observed_raw_mm[t] - ep.pixel_time_series.observed_raw_mm[t],
        ),
      ).toBeLessThanOrEqual(tol);
      expect(
        Math.abs(
          ap.pixel_time_series.observed_compensated_mm[t] -
            ep.pixel_time_series.observed_compensated_mm[t],
        ),
      ).toBeLessThanOrEqual(tol);
      expect(
        Math.abs(
          ap.pixel_time_series.expected_environmental_mm[t] -
            ep.pixel_time_series.expected_environmental_mm[t],
        ),
      ).toBeLessThanOrEqual(tol);
      expect(
        Math.abs(
          ap.pixel_time_series.residual_anomaly_mm[t] - ep.pixel_time_series.residual_anomaly_mm[t],
        ),
      ).toBeLessThanOrEqual(tol);
    }
  }
}

describe("Testes de Paridade Numérica Golden (S-B7) + Rotas Fastify (S-B3, R-B5)", () => {
  const presetGoldenFiles = fs
    .readdirSync(goldenDir)
    .filter((f) => f.endsWith(".json") && f.includes("__") && !f.startsWith("custom__"));

  for (const file of presetGoldenFiles) {
    it(`paridade exata (±0.01) para ${file}`, async () => {
      const fixture = JSON.parse(
        fs.readFileSync(path.join(goldenDir, file), "utf-8"),
      ) as GoldenFixture;

      const actual = await runPhaseZeroPipeline(fixture.request, {
        power: async (_lat, _lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: false,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [],
      });

      assertNumericParity(actual, fixture.response, 0.01);
    });
  }

  it("paridade exata (±0.01) para cenário custom com DEM 5x5 upsampled (zoom order=2) e CMR", async () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(goldenDir, "custom__mock_dem.json"), "utf-8"),
    ) as GoldenFixture;

    const actual = await runPhaseZeroPipeline(fixture.request, {
      power: async (_lat, _lon, s, e, n) => ({
        climate: syntheticClimate(s, e, n),
        isReal: false,
      }),
      terrain: async (_lat, _lon, size) =>
        processCustomElevations25(fixture.mock_elevations_25!, size),
      cmr: async () => fixture.mock_granules ?? [],
    });

    assertNumericParity(actual, fixture.response, 0.01);
  });

  it("rotas Fastify (/api/health, /api/scenarios, /api/analyze) validam schemas e retornam 200/400", async () => {
    const app = await buildApp({
      logger: false,
      pipelineDeps: {
        power: async (_lat, _lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: false,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [],
      },
    });

    const healthRes = await app.inject({ method: "GET", url: "/api/health" });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.json()).toEqual({
      status: "ok",
      service: "phase-zero-backend",
      version: "5.0.0",
    });

    const scRes = await app.inject({ method: "GET", url: "/api/scenarios" });
    expect(scRes.statusCode).toBe(200);
    expect(scRes.json().scenarios.length).toBe(4);

    const analyzeRes = await app.inject({
      method: "POST",
      url: "/api/analyze",
      payload: { scenario_id: "itaipu_normal" },
    });
    expect(analyzeRes.statusCode).toBe(200);
    expect(analyzeRes.json().status.code).toBe("GREEN");

    const badRes = await app.inject({
      method: "POST",
      url: "/api/analyze",
      payload: { min_coherence: 5.0 }, // inválido (> 1)
    });
    expect(badRes.statusCode).toBe(400);
    expect(badRes.json()).toHaveProperty("error", "ValidationError");

    await app.close();
  });

  it("busca customizada em barragem em risco (ex: Forquilha / B3-B4 / relevo íngreme) identifica Mureta/Talude e detecta anomalia RED em vez de zerar para GREEN", async () => {
    const resForquilha = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -20.2442,
        custom_lon: -43.8542,
        custom_name: "Teste Barragem Ouro Preto",
        start_date: "2026-03-01",
        end_date: "2026-09-15",
      },
      {
        power: async (_lat, _lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: true,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [],
      },
    );

    expect(resForquilha.status.code).toBe("RED");
    expect(Math.abs(resForquilha.status.residual_trend_mm_per_pass)).toBeGreaterThan(1.45);
    expect(resForquilha.status.max_weighted_anomaly_score).toBeGreaterThan(20.0);

    const crestPx = resForquilha.grid_pixels.find((p) => p.row === 8 && p.col === 9);
    const taludePx = resForquilha.grid_pixels.find((p) => p.row === 10 && p.col === 9);
    expect(crestPx?.zone).toContain("MURETA / CRISTA PRINCIPAL");
    expect(taludePx?.zone).toContain("PAREDÃO / TALUDE CENTRAL");
    expect(crestPx?.zone).not.toContain("VEGETAÇÃO");
    expect(taludePx?.zone).not.toContain("VEGETAÇÃO");
  });
});
