import { z } from "zod";

export const StatusCodeSchema = z.enum(["GREEN", "YELLOW", "RED"]);

export const AnalysisRequestSchema = z.object({
  scenario_id: z.string().default("gongo_soco_active"),
  apply_ionosphere: z.boolean().default(true),
  apply_troposphere: z.boolean().default(true),
  apply_solid_tides: z.boolean().default(true),
  apply_nasa_power: z.boolean().default(true),
  min_coherence: z.number().min(0).max(1).default(0.4),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD")
    .default("2026-03-01"),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD")
    .default("2026-09-15"),
  custom_lat: z.number().min(-90).max(90).nullish(),
  custom_lon: z.number().min(-180).max(180).nullish(),
  custom_name: z.string().max(120).nullish(),
  earthdata_token: z.string().nullish(),
});

export const ThermoLoopPointSchema = z.object({
  date: z.string(),
  surface_temp_c: z.number(),
  displacement_mm: z.number(),
  residual_mm: z.number(),
});

export const PixelTimeSeriesSchema = z.object({
  observed_raw_mm: z.array(z.number()),
  observed_compensated_mm: z.array(z.number()),
  expected_environmental_mm: z.array(z.number()),
  residual_anomaly_mm: z.array(z.number()),
  thermo_loop: z.array(ThermoLoopPointSchema),
});

export const GridPixelSchema = z.object({
  id: z.string(),
  row: z.number().int(),
  col: z.number().int(),
  zone: z.string(),
  lat: z.number(),
  lon: z.number(),
  elevation_m: z.number(),
  coherence: z.number(),
  compensated_los_mm: z.number(),
  residual_mm: z.number(),
  masked: z.boolean(),
  anomaly_score: z.number(),
  iono_uncertainty_mm: z.number(),
  pixel_time_series: PixelTimeSeriesSchema,
});

export const LosVectorSchema = z.object({
  losUnitVectorX: z.number(),
  losUnitVectorY: z.number(),
  incidenceAngle: z.number(),
  elevationAngle: z.number(),
});

export const ScenarioMetaSchema = z.object({
  name: z.string(),
  sensor: z.string(),
  lat: z.number(),
  lon: z.number(),
  los_vector: LosVectorSchema,
  regime_info: z.string(),
  power_real_ok: z.boolean(),
  cmr_granules_count: z.number().int(),
  h5_streamed_ok: z.boolean(),
  asf_status: z.object({
    latest_granule: z.string(),
  }),
});

export const StatisticalSignificanceSchema = z.object({
  p_value: z.number(),
  is_significant: z.boolean(),
  confidence_level: z.string(),
  method: z.string(),
  mann_kendall_s: z.number(),
  sens_slope_mm_per_pass: z.number(),
  trend_direction: z.enum(["subsidence", "uplift", "stable"]),
});

export const FiveYearDiscrepancyDirectionSchema = z.enum([
  "positive_surplus",
  "negative_deficit",
  "thermal_inversion_rain",
  "null_expected",
]);

export const ThermalShockLevelSchema = z.enum(["NONE", "MODERATE", "SEVERE"]);

export const MonthlyThermoPluvioDataSchema = z.object({
  month: z.number().int().min(1).max(12),
  month_name: z.string(),
  month_short: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  mean_temp_c: z.number(),
  max_temp_c: z.number(),
  min_temp_c: z.number(),
  thermal_shock_drop_c: z.number(),
  precip_total_mm: z.number(),
  precip_max_daily_mm: z.number(),
  thermal_factor: z.number().optional(),
  pluvio_factor: z.number().optional(),
  coupled_shock_index: z.number(),
  possible_thermal_shock: z.boolean().optional(),
  thermal_shock_level: ThermalShockLevelSchema.optional(),
  thermal_shock_verdict: z.string().optional(),
  formula_calculation: z.string().optional(),
  temp_diff_from_monthly_baseline_c: z.number(),
  precip_diff_from_monthly_baseline_mm: z.number(),
  month_discrepancy_score: z.number(),
  discrepancy_direction: FiveYearDiscrepancyDirectionSchema,
  was_same_as_expected: z.boolean(),
});

export const FiveYearHistoricalWindowSchema = z.object({
  year: z.number().int(),
  start_date: z.string(),
  end_date: z.string(),
  mean_temp_c: z.number(),
  max_temp_c: z.number(),
  min_temp_c: z.number(),
  thermal_shock_drop_c: z.number(),
  precip_total_mm: z.number(),
  precip_max_daily_mm: z.number(),
  coupled_shock_index: z.number(),
  temp_diff_from_baseline_c: z.number(),
  shock_diff_from_baseline_c: z.number(),
  precip_diff_from_baseline_mm: z.number(),
  year_discrepancy_score: z.number(),
  discrepancy_direction: FiveYearDiscrepancyDirectionSchema,
  dominant_monthly_behavior: z.string().optional(),
  shock_months_count: z.number().int().optional(),
  shock_months_names: z.array(z.string()).optional(),
  monthly_breakdown: z.array(MonthlyThermoPluvioDataSchema).optional(),
  was_same_as_expected: z.boolean(),
});

export const CorrelatedDamCategorySchema = z.enum([
  "collapsed_system",
  "critical_alert_system",
  "external_proven_case",
]);

export const CorrelatedDamEvidenceSchema = z.object({
  dam_id: z.string(),
  dam_name: z.string(),
  location: z.string(),
  category: CorrelatedDamCategorySchema,
  event_date_or_status: z.string(),
  recorded_thermal_drop_c: z.number(),
  recorded_precip_mm: z.number(),
  five_year_discrepancy_pct: z.number(),
  similarity_score_pct: z.number(),
  physical_mechanism: z.string(),
  external_source_ref: z.string(),
});

export const FiveYearDiscrepancyTrendSchema = z.enum([
  "nearly_null_stable",
  "moderate_oscillation",
  "high_discrepancy_dangerous",
]);

export const AppeearsThermoPluvioAnalysisSchema = z.object({
  appeears_product: z.string(),
  appeears_live_ok: z.boolean(),
  is_future_prediction: z.boolean(),
  target_period_label: z.string(),
  target_month_label: z.string().optional(),
  study_reference: z.string().optional(),
  formula_expression: z.string().optional(),
  core_question: z.string(),
  is_dangerous: z.boolean(),
  danger_tier: StatusCodeSchema,
  verdict_short: z.string(),
  verdict_summary: z.string(),
  physical_explanation: z.string(),
  current_or_predicted_metrics: z.object({
    mean_temp_c: z.number(),
    peak_hot_temp_c: z.number(),
    trough_cold_temp_c: z.number(),
    max_hot_to_cold_drop_c: z.number(),
    precip_total_mm: z.number(),
    precip_max_daily_mm: z.number(),
    thermal_factor: z.number().optional(),
    pluvio_factor: z.number().optional(),
    thermo_pluvio_shock_index: z.number(),
    possible_thermal_shock: z.boolean().optional(),
    thermal_shock_level: ThermalShockLevelSchema.optional(),
    formula_calculation: z.string().optional(),
  }),
  five_year_baseline: z.object({
    years_analyzed: z.array(z.number().int()),
    expected_mean_temp_c: z.number(),
    expected_hot_to_cold_drop_c: z.number(),
    expected_precip_total_mm: z.number(),
    mean_abs_temp_diff_5y_c: z.number(),
    mean_abs_precip_diff_5y_mm: z.number(),
    discrepancy_score: z.number(),
    discrepancy_trend: FiveYearDiscrepancyTrendSchema,
    happened_same_thing_in_5_years: z.boolean(),
    discrepancy_explanation: z.string(),
    historical_windows: z.array(FiveYearHistoricalWindowSchema),
  }),
  correlated_dams: z.array(CorrelatedDamEvidenceSchema),
});

export const AnalysisStatusSchema = z.object({
  code: StatusCodeSchema,
  label: z.string(),
  description: z.string(),
  residual_trend_mm_per_pass: z.number(),
  acceleration_index_mm: z.number(),
  max_weighted_anomaly_score: z.number(),
  significance: StatisticalSignificanceSchema.optional(),
});

export const AnalysisResponseSchema = z.object({
  scenario_meta: ScenarioMetaSchema,
  status: AnalysisStatusSchema,
  dates: z.array(z.string()),
  grid_pixels: z.array(GridPixelSchema),
  disclaimer: z.string(),
  appeears_thermo_pluvio: AppeearsThermoPluvioAnalysisSchema.optional(),
});

export const ScenarioItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  sensor: z.string(),
  wavelength_mm: z.number(),
  lat: z.number(),
  lon: z.number(),
  los_vector: LosVectorSchema,
  regime_info: z.string(),
  default_start: z.string(),
  default_end: z.string(),
});

export const ScenariosResponseSchema = z.object({
  scenarios: z.array(ScenarioItemSchema),
});

export const DamPhysicalStatusSchema = z.enum([
  "standing",
  "decommissioning",
  "collapsed",
]);

export const DamCatalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  lat: z.number(),
  lon: z.number(),
  physical_status: DamPhysicalStatusSchema,
  physical_status_label: z.string(),
  risk_tier: StatusCodeSchema,
  default_start: z.string(),
  default_end: z.string(),
  regime_info: z.string(),
  keywords: z.array(z.string()),
});

export const DamsResponseSchema = z.object({
  dams: z.array(DamCatalogItemSchema),
});

