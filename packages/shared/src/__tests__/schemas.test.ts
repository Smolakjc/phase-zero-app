import { describe, expect, it } from "vitest";
import {
  AnalysisRequestSchema,
  CLASSIFICATION_THRESHOLDS,
  GRID_SIZE,
  LAMBDA_NISAR_L_MM,
  LAMBDA_SENTINEL_C_MM,
  PIXEL_STEP_DEG,
} from "../index.js";

describe("@phase-zero/shared schemas e constantes (S-B2)", () => {
  it("exporta constantes físicas e geométricas esperadas", () => {
    expect(LAMBDA_NISAR_L_MM).toBe(238.4);
    expect(LAMBDA_SENTINEL_C_MM).toBe(55.5);
    expect(GRID_SIZE).toBe(18);
    expect(PIXEL_STEP_DEG).toBe(0.00072);
    expect(CLASSIFICATION_THRESHOLDS.GREEN_MAX_SLOPE_MM_PER_PASS).toBe(0.35);
  });

  it("aplica defaults no AnalysisRequestSchema e valida formatos", () => {
    const parsed = AnalysisRequestSchema.parse({});
    expect(parsed.scenario_id).toBe("gongo_soco_active");
    expect(parsed.apply_ionosphere).toBe(true);
    expect(parsed.min_coherence).toBe(0.4);
    expect(parsed.start_date).toBe("2026-03-01");

    expect(() => AnalysisRequestSchema.parse({ start_date: "01/03/2026" })).toThrow();
    expect(() => AnalysisRequestSchema.parse({ custom_lat: 95 })).toThrow();
    expect(() => AnalysisRequestSchema.parse({ custom_lon: -195 })).toThrow();
  });
});

