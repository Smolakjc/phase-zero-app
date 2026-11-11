import { describe, expect, it } from "vitest";
import {
  arange,
  argminAbs,
  clip,
  clipGrid,
  linspace,
  linspaceInt,
  mean,
  nanToNum,
  nanToNumGrid,
  round2,
  roundN,
  zeros,
} from "../lib/math.js";

describe("lib/math", () => {
  it("arange e zeros geram arrays do tamanho esperado", () => {
    expect(arange(5)).toEqual([0, 1, 2, 3, 4]);
    expect(arange(0)).toEqual([]);
    expect(arange(-3)).toEqual([]);
    expect(zeros(4)).toEqual([0, 0, 0, 0]);
    expect(zeros(0)).toEqual([]);
  });

  it("linspace e linspaceInt reproduzem np.linspace e dtype=int", () => {
    expect(linspace(0, 10, 5)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(linspace(5, 5, 1)).toEqual([5]);
    expect(linspace(0, 10, 0)).toEqual([]);
    // np.linspace(0, 17, 5, dtype=int) -> [0, 4, 8, 12, 17]
    expect(linspaceInt(0, 17, 5)).toEqual([0, 4, 8, 12, 17]);
  });

  it("mean calcula a média ignorando NaN e Infinity", () => {
    expect(mean([2, 4, 6, 8])).toBe(5);
    expect(mean([10, Number.NaN, 20, Number.POSITIVE_INFINITY])).toBe(15);
    expect(mean([])).toBe(0);
    expect(mean([Number.NaN])).toBe(0);
  });

  it("roundN e round2 aplicam banker's rounding (round half to even) igual ao Python", () => {
    // Em Python: round(2.5, 0) == 2 e round(3.5, 0) == 4
    expect(roundN(2.5, 0)).toBe(2);
    expect(roundN(3.5, 0)).toBe(4);
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.236)).toBe(1.24);
    expect(round2(-0.0001)).toBe(0);
    expect(Object.is(round2(-0.0001), -0)).toBe(false);
    expect(round2(Number.NaN)).toBe(0);
  });

  it("clip, nanToNum, clipGrid e nanToNumGrid tratam escalares e matrizes", () => {
    expect(clip(5, 0, 10)).toBe(5);
    expect(clip(-2, 0, 10)).toBe(0);
    expect(clip(15, 0, 10)).toBe(10);

    expect(nanToNum(3.14, 0)).toBe(3.14);
    expect(nanToNum(Number.NaN, 400)).toBe(400);
    expect(nanToNum(Number.NEGATIVE_INFINITY, -1)).toBe(-1);

    const grid = [
      [Number.NaN, 0.01],
      [0.5, 1.5],
    ];
    const clean = nanToNumGrid(grid, 0.5);
    expect(clean).toEqual([
      [0.5, 0.01],
      [0.5, 1.5],
    ]);
    expect(clipGrid(clean, 0.05, 0.99)).toEqual([
      [0.5, 0.05],
      [0.5, 0.99],
    ]);
  });

  it("argminAbs encontra o índice mais próximo do alvo", () => {
    expect(argminAbs([10, 20, 30, 40], 26)).toBe(2);
    expect(argminAbs([40, 30, 20, 10], 26)).toBe(1);
    expect(() => argminAbs([], 0)).toThrow();
  });
});

