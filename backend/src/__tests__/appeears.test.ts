import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEEARS_CORE_QUESTION,
  computeCoupledThermoPluvioShockIndex,
  evaluateThermoPluvioShockAndFiveYearForecast,
} from "@phase-zero/shared";
import {
  clearAppeearsCache,
  fetchAppeearsProductLayers,
  getAppeearsThermoPluvioAnalysis,
} from "../services/appeears.js";
import { syntheticClimate } from "../services/nasaPower.js";
import { runPhaseZeroPipeline } from "../services/pipeline.js";
import { getTerrainGrid } from "../services/terrain.js";

describe("Serviço NASA AppEEARS: Choque Quente-Frio com Chuva e Previsão Histórica (Até 15 Anos)", () => {
  beforeEach(() => {
    clearAppeearsCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchAppeearsProductLayers consulta /api/product/MOD11A1.061 e trata falhas com segurança", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        LST_Day_1km: { Layer: "LST_Day_1km", Units: "Kelvin" },
        LST_Night_1km: { Layer: "LST_Night_1km", Units: "Kelvin" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchAppeearsProductLayers(
      "MOD11A1.061",
      "token_valido_com_mais_de_vinte_caracteres_123",
    );
    expect(res.ok).toBe(true);
    expect(res.layers).toContain("LST_Day_1km");
    expect(res.layers).toContain("LST_Night_1km");

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const failRes = await fetchAppeearsProductLayers("MOD11A1.061");
    expect(failRes.ok).toBe(false);
    expect(failRes.layers).toEqual([]);
  });

  it("comprova que temperatura isolada sem chuva NÃO gera alto índice, mas mudança brusca quente-frio COM chuva dispara o risco", () => {
    // 1. Calor/oscilação térmica alta (-14°C), porém SEM chuva (0 mm) -> baixo risco (< 15)
    const dryThermalSwing = computeCoupledThermoPluvioShockIndex(-14.0, 0.5, 0.5);
    expect(dryThermalSwing).toBeLessThan(15.0);

    // 2. Chuva moderada (80 mm), porém SEM mudança brusca quente-frio (-1.8°C) -> baixo risco (< 17)
    const rainWithoutThermalShock = computeCoupledThermoPluvioShockIndex(-1.8, 80.0, 15.0);
    expect(rainWithoutThermalShock).toBeLessThan(17.0);

    // 3. Mudança brusca quente-frio (-14.2°C) ESPECIFICAMENTE com chuvas fortes (185 mm total, 52 mm/d pico) -> altíssimo risco!
    const coupledShockWithRain = computeCoupledThermoPluvioShockIndex(-14.2, 185.0, 52.0);
    expect(coupledShockWithRain).toBeGreaterThan(65.0);
  });

  it("prevê semana específica em 2027 comparando a mesma semana nos anos passados (até 15 anos): discrepância alta = EXTREMAMENTE PERIGOSO (RED)", async () => {
    const res = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -20.119,
        custom_lon: -44.121,
        custom_name: "Inspeção Preditiva 2027 - Quadrilátero Ferrífero",
        start_date: "2027-01-18",
        end_date: "2027-01-25",
      },
      {
        power: async (_lat, _lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: false,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [],
      },
    );

    const appeears = res.appeears_thermo_pluvio;
    expect(appeears).toBeDefined();
    expect(appeears?.core_question).toBe(APPEEARS_CORE_QUESTION);
    expect(appeears?.is_future_prediction).toBe(true);
    expect(appeears?.five_year_baseline.years_analyzed).toEqual([
      2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
    expect(appeears?.five_year_baseline.historical_windows.length).toBe(15);

    // Verifica que todas as 15 janelas históricas avaliam exatamente a mesma semana (01-18 a 01-25)
    for (const win of appeears!.five_year_baseline.historical_windows) {
      expect(win.start_date.endsWith("-01-18")).toBe(true);
      expect(win.end_date.endsWith("-01-25")).toBe(true);
      expect(typeof win.mean_temp_c).toBe("number");
      expect(typeof win.precip_total_mm).toBe("number");
    }

    // Não aconteceu a mesma coisa: houve discrepância para mais e para menos nos anos anteriores + choque quente-frio com chuva
    expect(appeears?.five_year_baseline.happened_same_thing_in_5_years).toBe(false);
    expect(appeears?.five_year_baseline.discrepancy_trend).toBe("high_discrepancy_dangerous");
    expect(appeears?.is_dangerous).toBe(true);
    expect(appeears?.danger_tier).toBe("RED");
    expect(res.status.code).toBe("RED");
  });

  it("prevê semana específica em 2027 onde aconteceu a MESMA coisa nos anos passados (diferença quase nula) = NÃO É PERIGOSO (GREEN)", async () => {
    const res = await runPhaseZeroPipeline(
      {
        scenario_id: "itaipu_normal",
        start_date: "2027-07-12",
        end_date: "2027-07-19",
      },
      {
        power: async (_lat, _lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: false,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [],
      },
    );

    const appeears = res.appeears_thermo_pluvio;
    expect(appeears).toBeDefined();
    expect(appeears?.is_future_prediction).toBe(true);
    expect(appeears?.five_year_baseline.years_analyzed).toEqual([
      2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
    expect(appeears?.five_year_baseline.historical_windows.length).toBe(15);
    expect(appeears?.five_year_baseline.happened_same_thing_in_5_years).toBe(true);
    expect(appeears?.five_year_baseline.discrepancy_trend).toBe("nearly_null_stable");
    expect(appeears?.is_dangerous).toBe(false);
    expect(appeears?.danger_tier).toBe("GREEN");
    expect(res.status.code).toBe("GREEN");
  });

  it("relaciona a anomalia a barragens que já romperam (Brumadinho, Fundão, Miraí), em alerta crítico (Gongo Soco, B3/B4, Forquilha) e casos reais externos (Derna, Edenville)", async () => {
    const analysis = await getAppeearsThermoPluvioAnalysis({
      lat: -20.119,
      lon: -44.121,
      start_date: "2018-07-01",
      end_date: "2019-01-20",
      scenario_id: "brumadinho_hist",
      current_climate: syntheticClimate("2018-07-01", "2019-01-20", 16),
      enable_live_fetch: false,
    });

    expect(analysis.five_year_baseline.years_analyzed).toEqual([
      2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018,
    ]);
    expect(analysis.five_year_baseline.historical_windows.length).toBe(15);
    expect(analysis.danger_tier).toBe("RED");

    const categories = new Set(analysis.correlated_dams.map((d) => d.category));
    expect(categories.has("collapsed_system")).toBe(true);
    expect(categories.has("critical_alert_system")).toBe(true);
    expect(categories.has("external_proven_case")).toBe(true);

    const ids = analysis.correlated_dams.map((d) => d.dam_id);
    expect(ids).toContain("brumadinho_b1");
    expect(ids).toContain("fundao_mariana_2015");
    expect(ids).toContain("sul_superior_gongo_soco");
    expect(ids).toContain("b3_b4_maravilhas");
    expect(ids).toContain("derna_libya_2023_ext");
    expect(ids).toContain("edenville_michigan_2020_ext");
  });

  it("avalia amostras históricas quando fornecidas e gera métricas numéricas sem descrições pré-fabricadas", () => {
    const baseClim = syntheticClimate("2026-01-10", "2026-01-17", 8);
    const result = evaluateThermoPluvioShockAndFiveYearForecast({
      lat: -19.9419,
      lon: -43.5997,
      start_date: "2027-01-10",
      end_date: "2027-01-17",
      custom_name: "Barragem Sul Superior / Mina Gongo Soco",
      current_climate: baseClim,
      appeears_live_ok: true,
      total_years_limit: 15,
    });

    expect(result.appeears_live_ok).toBe(true);
    expect(result.is_future_prediction).toBe(true);
    expect(result.five_year_baseline.historical_windows.length).toBe(15);
    expect(result.current_or_predicted_metrics.max_hot_to_cold_drop_c).toBeLessThan(-10.0);
    expect(result.current_or_predicted_metrics.precip_total_mm).toBeGreaterThan(50.0);

    // Garante que cada ano possui dados numéricos completos
    for (const win of result.five_year_baseline.historical_windows) {
      expect(typeof win.year).toBe("number");
      expect(typeof win.mean_temp_c).toBe("number");
      expect(typeof win.max_temp_c).toBe("number");
      expect(typeof win.min_temp_c).toBe("number");
      expect(typeof win.thermal_shock_drop_c).toBe("number");
      expect(typeof win.precip_total_mm).toBe("number");
      expect(typeof win.precip_max_daily_mm).toBe("number");
      expect(typeof win.coupled_shock_index).toBe("number");
      expect(typeof win.precip_diff_from_baseline_mm).toBe("number");
      expect(typeof win.temp_diff_from_baseline_c).toBe("number");
      expect(typeof win.year_discrepancy_score).toBe("number");
      expect(typeof win.was_same_as_expected).toBe("boolean");
      expect(typeof win.dominant_monthly_behavior).toBe("string");
      expect(win.dominant_monthly_behavior).toMatch(/\d+\/12 meses/);
      expect(win.monthly_breakdown?.length).toBe(12);

      // Garante detalhamento mensal completo para todos os 12 meses do ano
      for (const m of win.monthly_breakdown ?? []) {
        expect(m.month).toBeGreaterThanOrEqual(1);
        expect(m.month).toBeLessThanOrEqual(12);
        expect(typeof m.month_name).toBe("string");
        expect(typeof m.month_short).toBe("string");
        expect(typeof m.mean_temp_c).toBe("number");
        expect(typeof m.max_temp_c).toBe("number");
        expect(typeof m.min_temp_c).toBe("number");
        expect(typeof m.thermal_shock_drop_c).toBe("number");
        expect(typeof m.precip_total_mm).toBe("number");
        expect(typeof m.precip_max_daily_mm).toBe("number");
        expect(typeof m.coupled_shock_index).toBe("number");
        expect(typeof m.temp_diff_from_monthly_baseline_c).toBe("number");
        expect(typeof m.precip_diff_from_monthly_baseline_mm).toBe("number");
        expect(typeof m.month_discrepancy_score).toBe("number");
        expect(typeof m.discrepancy_direction).toBe("string");
        expect(typeof m.was_same_as_expected).toBe("boolean");
      }
    }
  });

  it("cruza rigorosamente temperatura com chuva: chuva isolada ou frio isolado NÃO gera RED (apenas YELLOW), mas o cruzamento conjunto gera RED", () => {
    const baseInput = {
      lat: -20.119,
      lon: -44.121,
      start_date: "2026-01-01",
      end_date: "2026-01-15",
      scenario_id: "custom",
      custom_name: "Ponto de Teste de Cruzamento",
      appeears_live_ok: true,
    };

    // 1. Queda térmica severa (-13°C), porém SEM chuva (apenas 0.5 mm) -> Deve ser YELLOW (Choque seco), JAMAIS RED
    const dryColdClimate = {
      dates: Array.from({ length: 16 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`),
      ts: [32.0, 31.5, 30.0, 28.0, 25.0, 22.0, 19.0, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0],
      sw: Array(16).fill(220),
      precip: Array(16).fill(0.03), // ~0.5 mm total
      rh: Array(16).fill(55),
      ps: Array(16).fill(96),
    };
    const dryColdResult = evaluateThermoPluvioShockAndFiveYearForecast({
      ...baseInput,
      current_climate: dryColdClimate,
    });
    expect(dryColdResult.danger_tier).toBe("YELLOW");
    expect(dryColdResult.verdict_short).toContain("período seco");

    // 2. Chuva torrencial (160 mm), porém SEM queda brusca de temperatura (variação suave de 1.5°C) -> Deve ser YELLOW (Sobrecarga hídrica), JAMAIS RED
    const warmRainClimate = {
      dates: Array.from({ length: 16 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`),
      ts: [26.0, 26.2, 25.8, 25.9, 25.5, 25.3, 25.0, 24.8, 25.1, 25.4, 25.6, 25.8, 26.0, 25.9, 25.7, 25.5],
      sw: Array(16).fill(160),
      precip: Array(16).fill(10.0), // 160 mm total
      rh: Array(16).fill(88),
      ps: Array(16).fill(96),
    };
    const warmRainResult = evaluateThermoPluvioShockAndFiveYearForecast({
      ...baseInput,
      current_climate: warmRainClimate,
    });
    expect(warmRainResult.danger_tier).toBe("YELLOW");
    expect(warmRainResult.verdict_short).toContain("sem choque térmico");

    // 3. CRUZAMENTO CONJUNTO: Queda brusca quente-frio (-13°C) CONJUGADA com chuva forte (150 mm) -> SIM, EXTREMAMENTE PERIGOSO (RED)
    const coupledDangerClimate = {
      dates: Array.from({ length: 16 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`),
      ts: [33.0, 32.5, 31.0, 29.0, 26.0, 22.0, 19.0, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0],
      sw: [260, 250, 240, 220, 180, 120, 90, 85, 95, 110, 130, 150, 170, 190, 200, 210],
      precip: [0, 0, 1.2, 3.5, 12.0, 32.0, 45.0, 28.0, 14.0, 8.0, 4.0, 2.0, 1.0, 0.5, 0, 0], // ~151 mm
      rh: [45, 48, 55, 65, 82, 92, 95, 94, 88, 80, 75, 70, 68, 65, 62, 60],
      ps: Array(16).fill(96),
    };
    const coupledResult = evaluateThermoPluvioShockAndFiveYearForecast({
      ...baseInput,
      current_climate: coupledDangerClimate,
    });
    expect(coupledResult.danger_tier).toBe("RED");
    expect(coupledResult.verdict_short).toContain("SIM, É EXTREMAMENTE PERIGOSO PARA A BARRAGEM");
  });
});
