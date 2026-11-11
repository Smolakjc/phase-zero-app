import { afterEach, describe, expect, it, vi } from "vitest";
import { GridPixel } from "@phase-zero/shared";
import { computeSymmetricTicks } from "../components/charts/Axis";
import { analyze, FALLBACK_SCENARIOS, getScenarios, ValidationError } from "../lib/api";
import {
  getMeshEdgeColor,
  getPixelNodeColor,
  getStatusStrokeColor,
} from "../lib/colors";
import {
  buildMesh,
  deriveGridDimensions,
  hitTest,
  project3D,
  sortByDepth,
} from "../lib/projection3d";
import { isValidEarthdataToken } from "../lib/tokenStorage";

function makeDummyPixel(row: number, col: number, elev: number, residual = 0, masked = false): GridPixel {
  return {
    id: `px_${row}_${col}`,
    row,
    col,
    zone: row === 0 ? "ÁGUA DA REPRESA" : "PAREDÃO / TALUDE CENTRAL",
    lat: -20 + row * 0.00072,
    lon: -44 + col * 0.00072,
    elevation_m: elev,
    coherence: masked ? 0.2 : 0.9,
    compensated_los_mm: residual,
    residual_mm: residual,
    masked,
    anomaly_score: Math.abs(residual) * 0.9,
    iono_uncertainty_mm: 2.85,
    pixel_time_series: {
      observed_raw_mm: [0, residual],
      observed_compensated_mm: [0, residual],
      expected_environmental_mm: [0, 0],
      residual_anomaly_mm: [0, residual],
      thermo_loop: [
        { date: "2026-03-01", surface_temp_c: 25, displacement_mm: 0, residual_mm: 0 },
        { date: "2026-09-15", surface_temp_c: 28, displacement_mm: residual, residual_mm: residual },
      ],
    },
  };
}

describe("Frontend lib: projection3d, colors, tokenStorage, Axis e api (K-F1, K-F5, S-F1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_USE_MOCK;
  });

  it("deriveGridDimensions, project3D, buildMesh, sortByDepth e hitTest funcionam para qualquer grade", () => {
    const pixels: GridPixel[] = [
      makeDummyPixel(0, 0, 100),
      makeDummyPixel(0, 1, 120),
      makeDummyPixel(1, 0, 110),
      makeDummyPixel(1, 1, 140),
    ];

    const dims = deriveGridDimensions(pixels);
    expect(dims.rows).toBe(2);
    expect(dims.cols).toBe(2);
    expect(dims.centerRow).toBe(0.5);
    expect(dims.minElev).toBe(100);
    expect(dims.maxElev).toBe(140);

    const params = {
      width: 800,
      height: 400,
      azimuthDeg: 34,
      pitchDeg: 54,
      dims,
    };

    const pt = project3D(0, 0, 100, params);
    expect(Number.isFinite(pt.x)).toBe(true);
    expect(Number.isFinite(pt.y)).toBe(true);
    expect(Number.isFinite(pt.depth)).toBe(true);

    const { nodes, segments } = buildMesh(pixels, params);
    expect(nodes.length).toBe(4);
    expect(segments.length).toBe(4); // 2 horizontais + 2 verticais numa grade 2x2

    const sorted = sortByDepth(nodes);
    expect(sorted[0].depth).toBeLessThanOrEqual(sorted[sorted.length - 1].depth);

    const targetNode = nodes[2];
    const hit = hitTest(nodes, targetNode.x + 2, targetNode.y - 2, 20);
    expect(hit?.id).toBe(targetNode.px.id);
    expect(hitTest(nodes, -9999, -9999, 20)).toBeNull();
  });

  it("getPixelNodeColor, getMeshEdgeColor e getStatusStrokeColor respeitam limiares", () => {
    expect(getPixelNodeColor(makeDummyPixel(0, 0, 100, 0, true))).toContain("14, 116, 144");
    expect(getPixelNodeColor(makeDummyPixel(1, 0, 100, 0, true))).toContain("30, 41, 59");
    expect(getPixelNodeColor(makeDummyPixel(1, 0, 100, 1.5, false))).toContain("16, 185, 129");
    expect(getPixelNodeColor(makeDummyPixel(1, 0, 100, -10.0, false))).toContain("245, 158, 11");
    expect(getPixelNodeColor(makeDummyPixel(1, 0, 100, -22.0, false))).toContain("244, 63, 94");

    expect(getMeshEdgeColor(true)).toContain("51, 65, 85");
    expect(getMeshEdgeColor(false)).toContain("56, 189, 248");
    expect(getStatusStrokeColor("GREEN")).toBe("#10b981");
    expect(getStatusStrokeColor("YELLOW")).toBe("#f59e0b");
    expect(getStatusStrokeColor("RED")).toBe("#f43f5e");
  });

  it("computeSymmetricTicks auto-escala valores que ultrapassam ±20 mm (Brumadinho/Maceió)", () => {
    const normal = computeSymmetricTicks([-5, 12], 20);
    expect(normal.extent).toBe(20);

    const extreme = computeSymmetricTicks([-44.5, 18.2], 20);
    expect(extreme.extent).toBeGreaterThanOrEqual(45);
  });

  it("isValidEarthdataToken exige > 20 caracteres", () => {
    expect(isValidEarthdataToken("short_token")).toBe(false);
    expect(isValidEarthdataToken("123456789012345678901")).toBe(true);
  });

  it("api.analyze suporta modo mock (NEXT_PUBLIC_USE_MOCK=1) e valida entrada com Zod", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "1";
    const res = await analyze({ scenario_id: "brumadinho_hist" });
    expect(res.status.code).toBe("RED");
    expect(res.grid_pixels.length).toBe(324);

    const scenarios = await getScenarios();
    expect(scenarios.length).toBe(FALLBACK_SCENARIOS.length);

    await expect(analyze({ min_coherence: 2.5 })).rejects.toBeInstanceOf(ValidationError);
  });
});

