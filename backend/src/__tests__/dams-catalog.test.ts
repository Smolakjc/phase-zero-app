import { describe, expect, it } from "vitest";
import { DamsResponseSchema } from "@phase-zero/shared";
import { buildApp } from "../app.js";
import { syntheticClimate } from "../services/nasaPower.js";
import { runPhaseZeroPipeline } from "../services/pipeline.js";
import { getTerrainGrid } from "../services/terrain.js";

describe("Catálogo e rotas de barragens (/api/dams)", () => {
  it("GET /api/dams retorna barragens de pé, em descaracterização e rompidas/históricas", async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: "GET", url: "/api/dams" });
    expect(res.statusCode).toBe(200);

    const parsed = DamsResponseSchema.parse(res.json());
    expect(parsed.dams.length).toBeGreaterThanOrEqual(21);

    const statuses = new Set(parsed.dams.map((d) => d.physical_status));
    expect(statuses.has("standing")).toBe(true);
    expect(statuses.has("decommissioning")).toBe(true);
    expect(statuses.has("collapsed")).toBe(true);

    const brumadinho = parsed.dams.find((d) => d.id === "brumadinho_b1");
    expect(brumadinho?.default_start).toBe("2018-07-01");
    expect(brumadinho?.default_end).toBe("2019-01-20");

    await app.close();
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
});
