import { describe, expect, it } from "vitest";
import { computeMannKendall, erfc, normalTwoTailedPValue } from "../lib/statisticalTrend.js";

describe("lib/statisticalTrend — Testes estatísticos oficiais do desafio", () => {
  it("aproximação de erfc e normalTwoTailedPValue para z = 1.96 resulta em ~0.05", () => {
    expect(erfc(0)).toBeCloseTo(1.0, 5);
    const p95 = normalTwoTailedPValue(1.96);
    expect(p95).toBeCloseTo(0.05, 2);
  });

  it("retorna indeterminado para séries com menos de 4 pontos", () => {
    const res = computeMannKendall([1, 2, 3]);
    expect(res.isSignificant).toBe(false);
    expect(res.pValue).toBe(1.0);
    expect(res.trendDirection).toBe("stable");
  });

  it("detecta tendência de subsidência monotônica estatisticamente significativa (p < 0.001)", () => {
    // Série de 16 pontos de subsidência acelerada
    const subsidenceSeries = [
      0.0, -0.4, -0.8, -1.3, -1.9, -2.5, -3.2, -4.0,
      -4.9, -5.9, -7.0, -8.2, -9.5, -11.0, -12.6, -14.3,
    ];
    const res = computeMannKendall(subsidenceSeries);

    expect(res.isSignificant).toBe(true);
    expect(res.pValue).toBeLessThan(0.001);
    expect(res.trendDirection).toBe("subsidence");
    expect(res.sensSlope).toBeLessThan(0);
    expect(res.s).toBeLessThan(0);
  });

  it("identifica estabilidade / ruído branco sem tendência significativa", () => {
    // Ruído oscilando em torno de zero
    const noiseSeries = [
      0.1, -0.2, 0.15, -0.1, 0.05, -0.05, 0.2, -0.15,
      0.1, -0.1, 0.05, -0.2, 0.15, -0.05, 0.1, -0.1,
    ];
    const res = computeMannKendall(noiseSeries);

    expect(res.isSignificant).toBe(false);
    expect(res.pValue).toBeGreaterThan(0.05);
    expect(res.trendDirection).toBe("stable");
  });
});
