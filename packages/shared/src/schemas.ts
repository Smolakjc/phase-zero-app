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

export const AnalysisStatusSchema = z.object({
  code: StatusCodeSchema,
  label: z.string(),
  description: z.string(),
  residual_trend_mm_per_pass: z.number(),
  acceleration_index_mm: z.number(),
  max_weighted_anomaly_score: z.number(),
});

export const AnalysisResponseSchema = z.object({
  scenario_meta: ScenarioMetaSchema,
  status: AnalysisStatusSchema,
  dates: z.array(z.string()),
  grid_pixels: z.array(GridPixelSchema),
  disclaimer: z.string(),
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

