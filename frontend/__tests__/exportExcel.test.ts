import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  AnalysisResponse,
  evaluateThermoPluvioShockAndFiveYearForecast,
} from "@phase-zero/shared";
import { buildExcelWorkbook, exportAnalysisToExcel } from "../lib/exportExcel";

describe("Exportação de Relatório InSAR em Planilha Excel (.xlsx)", () => {
  const fixturePath = path.resolve(
    __dirname,
    "../../backend/src/__tests__/fixtures/golden/gongo_soco_active__all_on.json",
  );
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as {
    response: AnalysisResponse;
  };
  const baseData = fixture.response;

  // Gerar dados hidroclimáticos realistas com a função do @phase-zero/shared
  const climateSample = {
    dates: ["2026-03-01", "2026-03-13", "2026-03-25"],
    ts: [28.5, 14.2, 22.0],
    sw: [200, 150, 180],
    precip: [15.0, 65.0, 5.0],
    rh: [80, 95, 75],
    ps: [920, 918, 921],
  };

  const fullData: AnalysisResponse = {
    ...baseData,
    appeears_thermo_pluvio: evaluateThermoPluvioShockAndFiveYearForecast({
      lat: baseData.scenario_meta.lat,
      lon: baseData.scenario_meta.lon,
      start_date: "2026-03-01",
      end_date: "2026-09-15",
      custom_name: baseData.scenario_meta.name,
      current_climate: climateSample,
      appeears_live_ok: true,
      total_years_limit: 5,
    }),
  };

  it("deve criar um workbook válido com todas as 5 abas esperadas", () => {
    const wb = buildExcelWorkbook(fullData, null);
    expect(wb.SheetNames).toEqual([
      "Sumário Executivo",
      "Série Temporal InSAR",
      "Grade de Pixels",
      "Hidroclimatologia",
      "Casos Correlatos",
    ]);
  });

  it("deve preencher a aba de Sumário Executivo com metadados e diagnóstico completos", () => {
    const wb = buildExcelWorkbook(fullData, null);
    const ws = wb.Sheets["Sumário Executivo"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const flatText = rows.flat().join(" ");
    expect(flatText).toContain("OBSERVATÓRIO INSAR");
    expect(flatText).toContain(fullData.scenario_meta.name);
    expect(flatText).toContain(fullData.status.code);
    expect(flatText).toContain(fullData.status.residual_trend_mm_per_pass.toString());
    expect(flatText).toContain(fullData.status.acceleration_index_mm.toString());
    expect(flatText).toContain(fullData.status.max_weighted_anomaly_score.toString());
    expect(flatText).toContain(fullData.scenario_meta.sensor);
    expect(flatText).toContain(fullData.disclaimer);
  });

  it("deve preencher a série temporal InSAR correspondente ao pixel de interesse", () => {
    const selectedPixel = fullData.grid_pixels[5];
    const wb = buildExcelWorkbook(fullData, selectedPixel);
    const ws = wb.Sheets["Série Temporal InSAR"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    expect(rows.length).toBeGreaterThan(fullData.dates.length);
    const headerRow = rows.find((r) => r.includes("Data da Passagem"));
    expect(headerRow).toBeDefined();
    expect(headerRow).toContain("Deslocamento Bruto (mm)");
    expect(headerRow).toContain("Deslocamento Compensado LOS (mm)");
    expect(headerRow).toContain("Resíduo Anômalo Puro (mm)");

    // Checar presença da primeira data
    const dateRow = rows.find((r) => r.includes(fullData.dates[0]));
    expect(dateRow).toBeDefined();
  });

  it("deve exportar todos os pixels da grade com coordenadas, cota e coerência", () => {
    const wb = buildExcelWorkbook(fullData, null);
    const ws = wb.Sheets["Grade de Pixels"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Cabeçalho + todos os pixels
    expect(rows.length).toBe(fullData.grid_pixels.length + 1);
    const header = rows[0];
    expect(header).toContain("ID Pixel");
    expect(header).toContain("Zona Estrutural");
    expect(header).toContain("Elevação DEM (m)");
    expect(header).toContain("Coerência (0-1)");
    expect(header).toContain("Resíduo Anômalo (mm)");

    const firstPxRow = rows[1];
    expect(firstPxRow[0]).toBe(fullData.grid_pixels[0].id);
    expect(firstPxRow[3]).toBe(fullData.grid_pixels[0].zone);
  });

  it("deve incluir métricas e histórico multianual na aba de Hidroclimatologia quando presente", () => {
    const wb = buildExcelWorkbook(fullData, null);
    const ws = wb.Sheets["Hidroclimatologia"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const flatText = rows.flat().join(" ");

    expect(flatText).toContain("BALANÇO HIDROCLIMÁTICO E CHOQUE TÉRMICO");
    expect(flatText).toContain("JANELAS HISTÓRICAS MULTIANUAIS");
    expect(flatText).toContain(fullData.appeears_thermo_pluvio!.danger_tier);
    expect(flatText).toContain(fullData.appeears_thermo_pluvio!.verdict_short);
  });

  it("deve tratar com fallback seguro quando dados hidroclimáticos não estão disponíveis", () => {
    const wb = buildExcelWorkbook(baseData, null);
    const ws = wb.Sheets["Hidroclimatologia"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const flatText = rows.flat().join(" ");

    expect(flatText).toContain("Dados hidroclimáticos não disponíveis para esta análise.");
  });

  it("deve incluir casos correlatos com índice de similaridade", () => {
    const wb = buildExcelWorkbook(fullData, null);
    const ws = wb.Sheets["Casos Correlatos"];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toContain("Barragem Comparada");
    expect(rows[0]).toContain("Similaridade (%)");
  });

  it("deve gerar nome de arquivo limpo e seguro para download", () => {
    const fileName = exportAnalysisToExcel(fullData, null);
    expect(fileName).toMatch(/^analise-insar-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(fileName).not.toContain(" ");
  });
});
