import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPEEARS_CORE_QUESTION,
  computeCoupledThermoPluvioShockIndex,
  computeMaxHotToColdDropC,
  computeThermoPluvioFormulaBreakdown,
  evaluateThermoPluvioShockAndFiveYearForecast,
  THERMAL_SHOCK_FORMULA_EXPRESSION,
  THERMAL_SHOCK_STUDY_REFERENCE,
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

    // 4. Prova contra falso positivo de amplitude mensal:
    // Mês de 30 dias com 32°C no dia 5 e 16°C no dia 22 (amplitude bruta do mês = 16°C),
    // mas com reaquecimento intermediário e queda máxima em 24h-72h de apenas -5.5°C (21.5°C -> 16.0°C).
    // Com P_mês = 100 mm e P_máx24h = 25 mm/d, NÃO deve usar 16°C (que daria I_CT = 65.2 CRÍTICO),
    // e sim a queda frontal de 24h-72h (-5.5°C), resultando em I_CT < 20 (NÃO houve choque térmico).
    const thirtyDayTs = [
      27.0, 28.0, 29.5, 31.0, 32.0, // dia 5: 32°C
      29.0, 27.5, 28.5, 29.5, 30.0, // esfriou 4.5°C e voltou a esquentar para 30°C
      29.0, 28.0, 27.0, 26.5, 27.0,
      26.0, 25.0, 24.0, 23.0, 21.5, // dia 20: 21.5°C
      18.5, 16.0, 18.0, 20.0, 22.0, // dia 22: 16.0°C (queda frontal de -5.5°C em 48h)
      23.5, 24.5, 25.0, 25.5, 26.0,
    ];
    const thirtyDayPrecip = [
      0, 0, 0, 0, 0,
      2, 5, 0, 0, 0,
      0, 5, 8, 5, 0,
      0, 5, 10, 10, 15,
      25, 10, 0, 0, 0, // pico de 25 mm/d junto à frente fria dos dias 20-22 (soma = 100 mm)
      0, 0, 0, 0, 0,
    ];
    const drop30d = computeMaxHotToColdDropC(thirtyDayTs, thirtyDayPrecip);
    expect(drop30d.maxDropC).toBe(-5.5);
    expect(drop30d.peakHotC).toBe(21.5);
    expect(drop30d.troughColdC).toBe(16.0);

    const formula30d = computeThermoPluvioFormulaBreakdown(drop30d.maxDropC, 100.0, 25.0);
    expect(formula30d.coupled_shock_index).toBeLessThan(20.0);
    expect(formula30d.possible_thermal_shock).toBe(false);
    expect(formula30d.thermal_shock_level).toBe("NONE");

    // 5. Prova contra o "Degrau dos 3.0°C" (frente seca de -13°C no início do mês + chuva quente de 2.8°C no dia 20):
    // Se esfriar apenas 2.8°C durante a chuva no dia 20, JAMAIS pode cair no fallback da frente seca de -13°C do dia 3!
    const dryFrontPlusWarmRainTs = [
      28.0, 31.0, 24.0, 18.0, 21.0, // dias 2-4: frente SECA derruba de 31°C para 18°C (-13.0°C, 0 mm de chuva)
      24.0, 26.0, 27.0, 27.5, 28.0,
      28.0, 27.5, 27.0, 27.5, 28.0,
      28.0, 27.5, 27.0, 26.4, 26.5, // dia 20: 26.5°C com chuva forte, caindo apenas -2.8°C para 23.7°C no dia 21
      23.7, 24.5, 25.5, 26.0, 26.5,
      26.5, 27.0, 27.0, 27.5, 27.5,
    ];
    const dryFrontPlusWarmRainPrecip = [
      0, 0, 0, 0, 0, // 0 mm na frente fria seca dos dias 2-4
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 15, 45, // chuva pré-frontal (i-1) e frontal nos dias 19-21 (total = 100 mm)
      40, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ];
    const warmRainDrop = computeMaxHotToColdDropC(
      dryFrontPlusWarmRainTs,
      dryFrontPlusWarmRainPrecip,
    );
    expect(warmRainDrop.maxDropC).toBe(-2.8);
    const warmRainFormula = computeThermoPluvioFormulaBreakdown(
      warmRainDrop.maxDropC,
      100.0,
      45.0,
    );
    expect(warmRainFormula.coupled_shock_index).toBeLessThan(16.0);
    expect(warmRainFormula.possible_thermal_shock).toBe(false);
    expect(warmRainFormula.thermal_shock_level).toBe("NONE");
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

  it("mantém coerência total entre cenários (Itaipu GREEN, Gongo Soco YELLOW, Brumadinho RED), identidade matemática (Vale - Pico = ΔT) e variabilidade real nos 15 anos", async () => {
    const mockDeps = {
      power: async (_lat: number, _lon: number, s: string, e: string, n?: number) => ({
        climate: syntheticClimate(s, e, n),
        isReal: false,
      }),
      terrain: async (lat: number, lon: number, size: number) =>
        getTerrainGrid(lat, lon, size, false),
      cmr: async () => [],
    };

    const itaipuRes = await runPhaseZeroPipeline({ scenario_id: "itaipu_normal" }, mockDeps);
    const gongoRes = await runPhaseZeroPipeline({ scenario_id: "gongo_soco_active" }, mockDeps);
    const brumRes = await runPhaseZeroPipeline({ scenario_id: "brumadinho_hist" }, mockDeps);

    // 1. Alinhamento entre status estrutural e diagnóstico termo-pluviométrico
    expect(itaipuRes.status.code).toBe("GREEN");
    expect(itaipuRes.appeears_thermo_pluvio?.danger_tier).toBe("GREEN");
    expect(itaipuRes.appeears_thermo_pluvio?.is_dangerous).toBe(false);

    expect(gongoRes.status.code).toBe("YELLOW");
    expect(gongoRes.appeears_thermo_pluvio?.danger_tier).toBe("YELLOW");

    expect(brumRes.status.code).toBe("RED");
    expect(brumRes.appeears_thermo_pluvio?.danger_tier).toBe("RED");

    // 2. Coerência forense exata em Brumadinho (-13.8°C e 164 mm)
    expect(brumRes.appeears_thermo_pluvio?.current_or_predicted_metrics.max_hot_to_cold_drop_c).toBe(
      -13.8,
    );
    expect(brumRes.appeears_thermo_pluvio?.current_or_predicted_metrics.precip_total_mm).toBe(
      164.0,
    );

    // 3. Identidade matemática exata (Vale - Pico = ΔT) e variabilidade interanual real (sem 15 anos clonados)
    for (const res of [itaipuRes, gongoRes, brumRes]) {
      const app = res.appeears_thermo_pluvio!;
      const m = app.current_or_predicted_metrics;
      expect(
        Math.abs(m.trough_cold_temp_c - m.peak_hot_temp_c - m.max_hot_to_cold_drop_c),
      ).toBeLessThanOrEqual(0.11);

      expect(app.five_year_baseline.mean_abs_temp_diff_5y_c).toBeGreaterThan(0);
      expect(app.five_year_baseline.mean_abs_precip_diff_5y_mm).toBeGreaterThan(0);

      const distinctAnnualPrecip = new Set(
        app.five_year_baseline.historical_windows.map((w) => w.precip_total_mm),
      );
      expect(distinctAnnualPrecip.size).toBeGreaterThanOrEqual(5);
    }

    // 4. Caso real: Usina Hidrelétrica de Barra Bonita (SP) — NUNCA pode ter 12/12 meses sem nenhuma anomalia
    const barraBonitaRes = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -22.5203,
        custom_lon: -48.5339,
        custom_name: "Usina Hidrelétrica de Barra Bonita (Barra Bonita, SP)",
        start_date: "2026-03-01",
        end_date: "2026-09-15",
      },
      mockDeps,
    );

    const bbApp = barraBonitaRes.appeears_thermo_pluvio!;
    expect(barraBonitaRes.status.code).toBe("GREEN");
    expect(bbApp.danger_tier).toBe("GREEN");
    expect(bbApp.study_reference).toBe(THERMAL_SHOCK_STUDY_REFERENCE);
    expect(bbApp.formula_expression).toBe(THERMAL_SHOCK_FORMULA_EXPRESSION);
    expect(typeof bbApp.current_or_predicted_metrics.thermal_factor).toBe("number");
    expect(typeof bbApp.current_or_predicted_metrics.pluvio_factor).toBe("number");
    expect(bbApp.current_or_predicted_metrics.possible_thermal_shock).toBe(false);

    // Em todos os 15 anos, cada mês calcula com certeza a temperatura, o índice pluviométrico e se houve possível choque térmico
    for (const win of bbApp.five_year_baseline.historical_windows) {
      const months = win.monthly_breakdown ?? [];
      expect(months.length).toBe(12);
      const shockMonths = months.filter((m) => m.possible_thermal_shock === true);
      expect(shockMonths.length).toBeGreaterThanOrEqual(2);
      expect(shockMonths.length).toBeLessThan(12);
      expect(win.shock_months_count).toBe(shockMonths.length);
      expect(win.shock_months_names?.length).toBe(shockMonths.length);

      for (const m of months) {
        const checkFormula = computeThermoPluvioFormulaBreakdown(
          m.thermal_shock_drop_c,
          m.precip_total_mm,
          m.precip_max_daily_mm,
        );
        expect(m.coupled_shock_index).toBe(checkFormula.coupled_shock_index);
        expect(m.possible_thermal_shock).toBe(checkFormula.possible_thermal_shock);
        expect(m.thermal_shock_level).toBe(checkFormula.thermal_shock_level);
      }
    }

    // Ao longo dos 15 anos de Barra Bonita, existem meses sem choque (null_expected) e meses com possível choque (positive_surplus / thermal_inversion_rain)
    const allMonthDirections = new Set(
      bbApp.five_year_baseline.historical_windows.flatMap((w) =>
        (w.monthly_breakdown ?? []).map((m) => m.discrepancy_direction),
      ),
    );
    expect(allMonthDirections.has("null_expected")).toBe(true);
    expect(
      allMonthDirections.has("positive_surplus") ||
        allMonthDirections.has("thermal_inversion_rain"),
    ).toBe(true);
  });
});
