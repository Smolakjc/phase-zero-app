import { z } from "zod";
import {
  AnalysisRequestSchema,
  AnalysisResponseSchema,
  AnalysisStatusSchema,
  DamCatalogItemSchema,
  DamPhysicalStatusSchema,
  DamsResponseSchema,
  GridPixelSchema,
  LosVectorSchema,
  PixelTimeSeriesSchema,
  ScenarioItemSchema,
  ScenarioMetaSchema,
  ScenariosResponseSchema,
  StatusCodeSchema,
  ThermoLoopPointSchema,
} from "./schemas";

export type StatusCode = z.infer<typeof StatusCodeSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisRequestInput = z.input<typeof AnalysisRequestSchema>;
export type ThermoLoopPoint = z.infer<typeof ThermoLoopPointSchema>;
export type PixelTimeSeries = z.infer<typeof PixelTimeSeriesSchema>;
export type GridPixel = z.infer<typeof GridPixelSchema>;
export type LosVector = z.infer<typeof LosVectorSchema>;
export type ScenarioMeta = z.infer<typeof ScenarioMetaSchema>;
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type ScenarioItem = z.infer<typeof ScenarioItemSchema>;
export type ScenariosResponse = z.infer<typeof ScenariosResponseSchema>;
export type DamPhysicalStatus = z.infer<typeof DamPhysicalStatusSchema>;
export type DamCatalogItem = z.infer<typeof DamCatalogItemSchema>;
export type DamsResponse = z.infer<typeof DamsResponseSchema>;

/** Série climática diária amostrada pelo serviço NASA POWER ou fallback sintético. */
export interface Climate {
  dates: string[];
  ts: number[];
  sw: number[];
  precip: number[];
  rh: number[];
  ps: number[];
}

export interface ClimateResult {
  climate: Climate;
  isReal: boolean;
}

/** Granule retornado pela busca no NASA CMR. */
export interface Granule {
  title: string;
  h5_url: string;
}

/** Janela HDF5 recortada (NISAR GUNW ou OPERA DISP-S1). */
export interface H5SliceResult {
  rawMmGrid: number[][];
  coherenceGrid: number[][];
  wavelengthMm: number;
}

