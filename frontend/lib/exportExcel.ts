import * as XLSX from "xlsx";
import {
  AnalysisRequest,
  AnalysisResponse,
  GridPixel,
} from "@phase-zero/shared";
import { stripDecorativeEmojis } from "./colors";

/**
 * Constrói o Workbook do Excel (.xlsx) contendo 5 abas detalhadas
 * para análise geotécnica, cinemática e hidroclimática.
 */
export function buildExcelWorkbook(
  data: AnalysisResponse,
  selectedPixel: GridPixel | null,
  params?: AnalysisRequest,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Pixel de referência para a série temporal (selecionado ou o mais anômalo / central)
  const targetPixel =
    selectedPixel ??
    data.grid_pixels.reduce((prev, curr) =>
      curr.anomaly_score > prev.anomaly_score ? curr : prev,
    data.grid_pixels[0] ?? null);

  const cleanTitle = stripDecorativeEmojis(data.scenario_meta.name);
  const cleanLabel = stripDecorativeEmojis(data.status.label);
  const cleanDesc = stripDecorativeEmojis(data.status.description);

  // ==========================================
  // ABA 1: Sumário Executivo & Diagnóstico
  // ==========================================
  const summaryRows: (string | number | boolean | null)[][] = [
    ["OBSERVATÓRIO INSAR — RELATÓRIO TÉCNICO DE MONITORAMENTO DE BARRAGENS"],
    ["Data de Geração do Relatório:", new Date().toLocaleString("pt-BR")],
    [],
    ["1. IDENTIFICAÇÃO DO ALVO"],
    ["Barragem / Alvo:", cleanTitle],
    ["Latitude:", data.scenario_meta.lat],
    ["Longitude:", data.scenario_meta.lon],
    ["Regime Operacional / Geologia:", data.scenario_meta.regime_info],
    [],
    ["2. DIAGNÓSTICO E RISCO ESTRUTURAL"],
    ["Classificação de Risco:", data.status.code],
    ["Status Operacional:", cleanLabel],
    ["Parecer Técnico:", cleanDesc],
    ["Velocidade Residual LOS:", data.status.residual_trend_mm_per_pass, "mm/passagem"],
    ["Índice de Aceleração Cinemática:", data.status.acceleration_index_mm, "mm"],
    ["Score de Anomalia Ponderado (γ):", data.status.max_weighted_anomaly_score, "/ 100"],
    [
      "Significância Estatística:",
      data.status.significance?.is_significant
        ? `Significativo (${data.status.significance.confidence_level})`
        : "Não conclusivo",
      data.status.significance?.method ?? "-",
    ],
    ["p-valor:", data.status.significance?.p_value ?? "N/A"],
    ["Declividade Sen (mm/passagem):", data.status.significance?.sens_slope_mm_per_pass ?? "N/A"],
    ["Direção da Tendência:", data.status.significance?.trend_direction ?? "N/A"],
    [],
    ["3. PARÂMETROS ORBITAIS E AMBIENTAIS"],
    ["Sensor / Satélite:", data.scenario_meta.sensor],
    ["Ângulo de Incidência:", data.scenario_meta.los_vector.incidenceAngle, "graus"],
    ["Ângulo de Elevação:", data.scenario_meta.los_vector.elevationAngle, "graus"],
    [
      "Vetor LOS (X, Y):",
      `(${data.scenario_meta.los_vector.losUnitVectorX}, ${data.scenario_meta.los_vector.losUnitVectorY})`,
    ],
    ["Passagens Orbitais Analisadas:", data.scenario_meta.cmr_granules_count, "cenas SAR"],
    [
      "Período Observado:",
      `${data.dates[0] ?? params?.start_date ?? ""} até ${
        data.dates[data.dates.length - 1] ?? params?.end_date ?? ""
      }`,
    ],
    [
      "Telemetria Climática:",
      data.scenario_meta.power_real_ok ? "NASA POWER Live (Real)" : "Modelo Calibrado",
    ],
    ["Streaming HDF5:", data.scenario_meta.h5_streamed_ok ? "Confirmado" : "Simulado"],
    [],
    ["4. AVISO METODOLÓGICO"],
    ["Aviso:", data.disclaimer],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  applyAutoWidth(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Sumário Executivo");

  // ==========================================
  // ABA 2: Série Temporal InSAR
  // ==========================================
  const timeSeriesRows: (string | number)[][] = [];

  if (targetPixel) {
    timeSeriesRows.push([
      `SÉRIE TEMPORAL — PIXEL ${targetPixel.id} (Zona: ${targetPixel.zone}, Lat: ${targetPixel.lat.toFixed(
        5,
      )}°, Lon: ${targetPixel.lon.toFixed(5)}°, Cota: ${targetPixel.elevation_m.toFixed(1)}m)`,
    ]);
  } else {
    timeSeriesRows.push(["SÉRIE TEMPORAL InSAR"]);
  }

  timeSeriesRows.push([]);
  timeSeriesRows.push([
    "Data da Passagem",
    "Deslocamento Bruto (mm)",
    "Deslocamento Compensado LOS (mm)",
    "Modelo Ambiental Térmico Esperado (mm)",
    "Resíduo Anômalo Puro (mm)",
    "Temp. Superfície (°C)",
    "Deslocamento Térmico Loop (mm)",
  ]);

  if (targetPixel) {
    const ts = targetPixel.pixel_time_series;
    for (let i = 0; i < data.dates.length; i++) {
      const dt = data.dates[i];
      const raw = ts.observed_raw_mm[i] ?? 0;
      const comp = ts.observed_compensated_mm[i] ?? 0;
      const env = ts.expected_environmental_mm[i] ?? 0;
      const res = ts.residual_anomaly_mm[i] ?? 0;
      const tLoop = ts.thermo_loop[i];

      timeSeriesRows.push([
        dt,
        round(raw, 2),
        round(comp, 2),
        round(env, 2),
        round(res, 2),
        tLoop ? round(tLoop.surface_temp_c, 1) : "",
        tLoop ? round(tLoop.displacement_mm, 2) : "",
      ]);
    }
  }

  const wsTimeSeries = XLSX.utils.aoa_to_sheet(timeSeriesRows);
  applyAutoWidth(wsTimeSeries, timeSeriesRows);
  XLSX.utils.book_append_sheet(wb, wsTimeSeries, "Série Temporal InSAR");

  // ==========================================
  // ABA 3: Grade de Pixels (Topografia & Resíduos)
  // ==========================================
  const pixelGridRows: (string | number)[][] = [
    [
      "ID Pixel",
      "Linha",
      "Coluna",
      "Zona Estrutural",
      "Latitude",
      "Longitude",
      "Elevação DEM (m)",
      "Coerência (0-1)",
      "Deslocamento LOS (mm)",
      "Resíduo Anômalo (mm)",
      "Score Anomalia",
      "Incerteza Iono (mm)",
      "Status",
    ],
  ];

  for (const px of data.grid_pixels) {
    pixelGridRows.push([
      px.id,
      px.row,
      px.col,
      px.zone,
      round(px.lat, 5),
      round(px.lon, 5),
      round(px.elevation_m, 1),
      round(px.coherence, 3),
      round(px.compensated_los_mm, 2),
      round(px.residual_mm, 2),
      round(px.anomaly_score, 1),
      round(px.iono_uncertainty_mm, 2),
      px.masked ? "Descartado (< Coerência Mínima)" : "Válido",
    ]);
  }

  const wsPixels = XLSX.utils.aoa_to_sheet(pixelGridRows);
  applyAutoWidth(wsPixels, pixelGridRows);
  XLSX.utils.book_append_sheet(wb, wsPixels, "Grade de Pixels");

  // ==========================================
  // ABA 4: Hidroclimatologia & Choque Térmico
  // ==========================================
  const climateRows: (string | number | boolean)[][] = [];
  const app = data.appeears_thermo_pluvio;

  if (app) {
    climateRows.push(["BALANÇO HIDROCLIMÁTICO E CHOQUE TÉRMICO (NASA AppEEARS / POWER)"]);
    climateRows.push(["Período Alvo:", app.target_period_label]);
    climateRows.push(["Classificação de Risco Hidrotermal:", app.danger_tier]);
    climateRows.push(["Diagnóstico Curto:", app.verdict_short]);
    climateRows.push(["Resumo Físico:", app.verdict_summary]);
    climateRows.push(["Mecanismo Físico:", app.physical_explanation]);
    climateRows.push([]);
    climateRows.push(["INDICADORES DO PERÍODO ATUAL / PREVISTO"]);
    climateRows.push(["Temperatura Média (°C):", round(app.current_or_predicted_metrics.mean_temp_c, 1)]);
    climateRows.push(["Pico Máximo de Calor (°C):", round(app.current_or_predicted_metrics.peak_hot_temp_c, 1)]);
    climateRows.push(["Mínima Absoluta (°C):", round(app.current_or_predicted_metrics.trough_cold_temp_c, 1)]);
    climateRows.push(["Queda de Choque Térmico (Drop °C):", round(app.current_or_predicted_metrics.max_hot_to_cold_drop_c, 1)]);
    climateRows.push(["Precipitação Total Acumulada (mm):", round(app.current_or_predicted_metrics.precip_total_mm, 1)]);
    climateRows.push(["Chuva Máxima em 24h (mm):", round(app.current_or_predicted_metrics.precip_max_daily_mm, 1)]);
    climateRows.push([
      "Índice Acoplado Choque Térmico/Chuva:",
      round(app.current_or_predicted_metrics.thermo_pluvio_shock_index, 1),
    ]);
    climateRows.push(["Nível de Choque Térmico:", app.current_or_predicted_metrics.thermal_shock_level ?? "NONE"]);
    climateRows.push([]);

    // Janelas Históricas Multianuais
    const hw = app.five_year_baseline.historical_windows;
    if (hw && hw.length > 0) {
      climateRows.push(["JANELAS HISTÓRICAS MULTIANUAIS"]);
      climateRows.push([
        "Ano",
        "Data Início",
        "Data Fim",
        "Temp Média (°C)",
        "Drop Térmico (°C)",
        "Chuva Total (mm)",
        "Chuva Máx Diária (mm)",
        "Índice Acoplado",
        "Discrepância Score",
      ]);

      for (const w of hw) {
        climateRows.push([
          w.year,
          w.start_date,
          w.end_date,
          round(w.mean_temp_c, 1),
          round(w.thermal_shock_drop_c, 1),
          round(w.precip_total_mm, 1),
          round(w.precip_max_daily_mm, 1),
          round(w.coupled_shock_index, 1),
          round(w.year_discrepancy_score, 1),
        ]);
      }
      climateRows.push([]);

      // Balanço Mensal do Ano Mais Recente / Atual
      const latestWindow = hw[hw.length - 1] ?? hw[0];
      const mb = latestWindow?.monthly_breakdown;
      if (mb && mb.length > 0) {
        climateRows.push([`BALANÇO MENSAL DETALHADO (ANO ${latestWindow.year})`]);
        climateRows.push([
          "Mês",
          "Nome do Mês",
          "Temp Média (°C)",
          "Temp Máx (°C)",
          "Temp Mín (°C)",
          "Drop Térmico (°C)",
          "Chuva Total (mm)",
          "Chuva Máx Diária (mm)",
          "Índice Acoplado",
          "Nível Choque",
          "Discrepância vs Histórico",
        ]);

        for (const m of mb) {
          climateRows.push([
            m.month,
            m.month_name,
            round(m.mean_temp_c, 1),
            round(m.max_temp_c, 1),
            round(m.min_temp_c, 1),
            round(m.thermal_shock_drop_c, 1),
            round(m.precip_total_mm, 1),
            round(m.precip_max_daily_mm, 1),
            round(m.coupled_shock_index, 1),
            m.thermal_shock_level ?? "-",
            m.discrepancy_direction,
          ]);
        }
      }
    }
  } else {
    climateRows.push(["Dados hidroclimáticos não disponíveis para esta análise."]);
  }

  const wsClimate = XLSX.utils.aoa_to_sheet(climateRows);
  applyAutoWidth(wsClimate, climateRows);
  XLSX.utils.book_append_sheet(wb, wsClimate, "Hidroclimatologia");

  // ==========================================
  // ABA 5: Casos Correlatos
  // ==========================================
  const correlationRows: (string | number)[][] = [
    [
      "Barragem Comparada",
      "Localização",
      "Categoria",
      "Evento / Status",
      "Similaridade (%)",
      "Choque Térmico (°C)",
      "Chuva Acumulada (mm)",
      "Discrepância 5 Anos (%)",
      "Mecanismo Físico",
      "Fonte / Referência",
    ],
  ];

  if (app?.correlated_dams && app.correlated_dams.length > 0) {
    for (const c of app.correlated_dams) {
      correlationRows.push([
        c.dam_name,
        c.location,
        c.category,
        c.event_date_or_status,
        round(c.similarity_score_pct, 1),
        round(c.recorded_thermal_drop_c, 1),
        round(c.recorded_precip_mm, 1),
        round(c.five_year_discrepancy_pct, 1),
        c.physical_mechanism,
        c.external_source_ref,
      ]);
    }
  } else {
    correlationRows.push(["Nenhum caso correlato registrado no modelo para os limiares atuais."]);
  }

  const wsCorrelations = XLSX.utils.aoa_to_sheet(correlationRows);
  applyAutoWidth(wsCorrelations, correlationRows);
  XLSX.utils.book_append_sheet(wb, wsCorrelations, "Casos Correlatos");

  return wb;
}

/**
 * Dispara o download imediato do arquivo .xlsx no navegador.
 */
export function exportAnalysisToExcel(
  data: AnalysisResponse,
  selectedPixel: GridPixel | null,
  params?: AnalysisRequest,
): string {
  const wb = buildExcelWorkbook(data, selectedPixel, params);

  const rawName = data.scenario_meta.name;
  const safeName = stripDecorativeEmojis(rawName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `analise-insar-${safeName || "alvo"}-${today}.xlsx`;

  if (typeof window !== "undefined") {
    XLSX.writeFile(wb, fileName);
  }

  return fileName;
}

/**
 * Ajusta a largura das colunas dinamicamente para fácil leitura no Excel.
 */
function applyAutoWidth(
  ws: XLSX.WorkSheet,
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const colWidths: number[] = [];

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      const str = val != null ? String(val) : "";
      colWidths[c] = Math.max(colWidths[c] ?? 8, str.length);
    }
  }

  ws["!cols"] = colWidths.map((len) => ({
    wch: Math.min(Math.max(len + 3, 10), 65),
  }));
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
