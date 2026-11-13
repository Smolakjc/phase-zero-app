import { describe, expect, it } from "vitest";
import { DamsResponseSchema } from "@phase-zero/shared";
import { buildApp } from "../app.js";
import { syntheticClimate } from "../services/nasaPower.js";
import { runPhaseZeroPipeline } from "../services/pipeline.js";
import { getTerrainGrid, processCustomElevations25 } from "../services/terrain.js";

describe("Catálogo e rotas de barragens (/api/dams)", () => {
  it("GET /api/dams retorna barragens de pé, em descaracterização e rompidas/históricas", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/api/dams" });
    expect(res.statusCode).toBe(200);

    const parsed = DamsResponseSchema.parse(res.json());
    expect(parsed.dams.length).toBeGreaterThanOrEqual(90);

    const statuses = new Set(parsed.dams.map((d) => d.physical_status));
    expect(statuses.has("standing")).toBe(true);
    expect(statuses.has("decommissioning")).toBe(true);
    expect(statuses.has("collapsed")).toBe(true);

    const brumadinho = parsed.dams.find((d) => d.id === "brumadinho_b1");
    expect(brumadinho?.default_start).toBe("2018-07-01");
    expect(brumadinho?.default_end).toBe("2019-01-20");

    await app.close();
  });

  it("classifica com precisão as 7 zonas geomorfométricas (Água, Mureta, Paredão, Berma, Ombreira, Vegetação Densa e Vale)", async () => {
    const deps = {
      power: async (_lat: number, _lon: number, s: string, e: string, n?: number) => ({
        climate: syntheticClimate(s, e, n),
        isReal: true,
      }),
      terrain: async (lat: number, lon: number, size: number) => getTerrainGrid(lat, lon, size, false),
      cmr: async () => [],
    };

    const res = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -19.9419,
        custom_lon: -43.5997,
        custom_name: "Barragem Sul Superior / Mina Gongo Soco (Barão de Cocais, MG)",
        min_coherence: 0.4,
      },
      deps,
    );

    const waterPx = res.grid_pixels.find((p) => p.row === 2 && p.col === 9);
    const crestPx = res.grid_pixels.find((p) => p.row === 6 && p.col === 9);
    const slopePx = res.grid_pixels.find((p) => p.row === 10 && p.col === 9);
    const bermPx = res.grid_pixels.find((p) => p.row === 13 && p.col === 9);
    const abutmentPx = res.grid_pixels.find((p) => p.row === 9 && p.col === 2);
    const vegPx = res.grid_pixels.find((p) => p.row === 10 && p.col === 0);
    const valleyPx = res.grid_pixels.find((p) => p.row === 16 && p.col === 9);

    expect(waterPx?.zone).toContain("ÁGUA DA REPRESA / RESERVATÓRIO");
    expect(waterPx?.masked).toBe(true);

    expect(crestPx?.zone).toContain("MURETA / CRISTA PRINCIPAL");
    expect(crestPx?.zone).toContain("Decliv:");
    expect(crestPx?.masked).toBe(false);

    expect(slopePx?.zone).toContain("PAREDÃO / TALUDE CENTRAL");
    expect(slopePx?.masked).toBe(false);

    expect(bermPx?.zone).toContain("BERMA DE PÉ / TALUDE INFERIOR");
    expect(bermPx?.masked).toBe(false);

    expect(abutmentPx?.zone).toContain("OMBREIRA / ENCOSTA ROCHOSA");
    expect(abutmentPx?.masked).toBe(false);

    expect(vegPx?.zone).toContain("VEGETAÇÃO DENSA / MATA NATIVA");
    expect(vegPx?.coherence).toBeLessThan(0.36);
    expect(vegPx?.masked).toBe(true);

    expect(valleyPx?.zone).toContain("VALE A JUSANTE / DRENAGEM");
    expect(valleyPx?.masked).toBe(false);
  });

  it("classifica corretamente barragens de pé (GREEN/YELLOW) e históricas rompidas (RED)", async () => {
    const deps = {
      power: async (_lat: number, _lon: number, s: string, e: string, n?: number) => ({
        climate: syntheticClimate(s, e, n),
        isReal: true,
      }),
      terrain: async (lat: number, lon: number, size: number) => getTerrainGrid(lat, lon, size, false),
      cmr: async () => [],
    };

    const tucurui = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -3.8322,
        custom_lon: -49.6471,
        custom_name: "Usina Hidrelétrica de Tucuruí (Tucuruí, PA)",
        start_date: "2026-03-01",
        end_date: "2026-09-15",
      },
      deps,
    );
    expect(tucurui.status.code).toBe("GREEN");

    const brucutu = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -19.865,
        custom_lon: -43.375,
        custom_name: "Barragem Laranjeiras / Brucutu (São Gonçalo do Rio Abaixo, MG)",
        start_date: "2026-03-01",
        end_date: "2026-09-15",
      },
      deps,
    );
    expect(brucutu.status.code).toBe("YELLOW");

    const fundao = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -20.1992,
        custom_lon: -43.4903,
        custom_name: "Barragem do Fundão (Mariana, MG - Histórico 2015)",
        start_date: "2015-05-01",
        end_date: "2015-11-04",
      },
      deps,
    );
    expect(fundao.status.code).toBe("RED");
  });

  it("coordenada livre distante com nome residual de Gongo Soco e relevo plano não trava no cenário de Gongo Soco", async () => {
    const flat25 = Array.from({ length: 25 }, () => 760.0);
    const deps = {
      power: async (_lat: number, _lon: number, s: string, e: string, n?: number) => ({
        climate: syntheticClimate(s, e, n),
        isReal: true,
      }),
      terrain: async (_lat: number, _lon: number, size: number) =>
        processCustomElevations25(flat25, size),
      cmr: async () => [],
    };

    const result = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -23.5505,
        custom_lon: -46.6333,
        custom_name: "Barragem Sul Superior / Mina Gongo Soco (Barão de Cocais, MG)",
        start_date: "2024-01-10",
        end_date: "2024-06-20",
      },
      deps,
    );

    expect(result.scenario_meta.lat).toBeCloseTo(-23.5505, 4);
    expect(result.scenario_meta.lon).toBeCloseTo(-46.6333, 4);
    expect(result.scenario_meta.regime_info).toContain("Estável DEM");
    expect(result.scenario_meta.regime_info).not.toContain("Gongo Soco");
    expect(result.scenario_meta.regime_info).not.toContain("Relevo Íngreme DEM");
    expect(result.status.code).toBe("GREEN");
    expect(Math.abs(result.status.residual_trend_mm_per_pass)).toBeLessThan(0.5);
    expect(result.dates[0]).toBe("2024-01-10");
    expect(result.dates.at(-1)?.startsWith("2024-06-")).toBe(true);
  });
});
