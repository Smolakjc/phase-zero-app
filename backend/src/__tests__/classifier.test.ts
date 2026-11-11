import { describe, expect, it } from "vitest";
import {
  classify,
  computeAcceleration,
  computeSlope,
  maxScore,
} from "../services/classifier.js";

describe("services/classifier (S-B6)", () => {
  it("calcula computeSlope, computeAcceleration e maxScore corretamente", () => {
    expect(computeSlope([])).toBe(0);
    expect(computeAcceleration([])).toBe(0);
    expect(maxScore([])).toBe(0);

    const series = [0, -1, -2, -3, -4]; // linear: slope = -1, accel = -4 - 2*(-2) + 0 = 0
    expect(computeSlope(series)).toBeCloseTo(-1.0, 5);
    expect(computeAcceleration(series)).toBeCloseTo(0.0, 5);
    expect(maxScore([1.2, 10.32, 4.5])).toBe(10.32);
  });

  it("testa fronteiras exatas de classificação (0.35, 1.45, 4.5, 5.0, 20.0)", () => {
    // Fronteira GREEN -> YELLOW em |slope| = 0.35 e score = 5.0
    expect(classify(0.349, 0.0, 4.99).code).toBe("GREEN");
    expect(classify(-0.349, 2.0, 4.99).code).toBe("GREEN");
    expect(classify(0.35, 0.0, 4.99).code).toBe("YELLOW");
    expect(classify(0.1, 0.0, 5.0).code).toBe("YELLOW");

    // Fronteira YELLOW -> RED em |slope| = 1.45, |accel| = 4.5, score = 20.0
    expect(classify(-1.449, -4.49, 19.99).code).toBe("YELLOW");
    expect(classify(-1.45, -1.0, 10.0).code).toBe("RED");
    expect(classify(-0.8, -4.5, 10.0).code).toBe("RED");
    expect(classify(-0.8, -1.0, 20.0).code).toBe("RED");
  });

  it("classifica corretamente as métricas dos 4 presets calibrados", () => {
    // 1. Itaipu -> GREEN
    expect(classify(0.0, 0.0, 0.0).code).toBe("GREEN");
    // 2. Gongo Soco -> YELLOW
    expect(classify(-0.76, -2.25, 10.32).code).toBe("YELLOW");
    // 3. Maceió -> RED
    expect(classify(-1.82, -8.99, 24.54).code).toBe("RED");
    // 4. Brumadinho -> RED
    expect(classify(-2.83, -16.64, 38.23).code).toBe("RED");
  });
});

