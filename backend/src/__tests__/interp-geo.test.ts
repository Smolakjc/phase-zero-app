import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toProjected } from "../lib/geo.js";
import { bilinear2D, zoom2D } from "../lib/interp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refPath = path.join(__dirname, "fixtures", "golden", "math_interp_geo_ref.json");
const refData = JSON.parse(fs.readFileSync(refPath, "utf-8")) as {
  elevs_25: number[];
  zoomed_18x18: number[][];
  bilinear: {
    ry: number[];
    rx: number[];
    values: number[][];
    points: [number, number][];
    expected: number[];
  };
  geo_cases: { lat: number; lon: number; epsg: number; x: number; y: number }[];
};

describe("lib/interp e lib/geo contra referências do Python (SciPy / PyProj)", () => {
  it("bilinear2D reproduz scipy.interpolate.RegularGridInterpolator", () => {
    const { ry, rx, values, points, expected } = refData.bilinear;
    const actual = bilinear2D(ry, rx, values, points, 0.0);
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i += 1) {
      expect(actual[i]).toBeCloseTo(expected[i], 8);
    }
  });

  it("zoom2D(order=2) reproduz scipy.ndimage.zoom(5x5 -> 18x18, order=2)", () => {
    const matrix5x5: number[][] = [];
    for (let r = 0; r < 5; r += 1) {
      matrix5x5.push(refData.elevs_25.slice(r * 5, (r + 1) * 5));
    }
    const zoomed = zoom2D(matrix5x5, 18 / 5.0, 2);
    expect(zoomed.length).toBe(18);
    expect(zoomed[0].length).toBe(18);

    for (let r = 0; r < 18; r += 1) {
      for (let c = 0; c < 18; c += 1) {
        expect(Math.abs(zoomed[r][c] - refData.zoomed_18x18[r][c])).toBeLessThan(1e-6);
      }
    }
  });

  it("zoom2D(order=1) executa interpolação bilinear e trata matriz vazia", () => {
    expect(zoom2D([], 2, 1)).toEqual([]);
    const m = [
      [0, 10],
      [10, 20],
    ];
    const z = zoom2D(m, 1.5, 1);
    expect(z.length).toBe(3);
    expect(z[1][1]).toBeCloseTo(10, 6);
  });

  it("toProjected reproduz pyproj.Transformer para zonas UTM Norte e Sul", () => {
    for (const c of refData.geo_cases) {
      const { x, y } = toProjected(c.lat, c.lon, c.epsg);
      expect(Math.abs(x - c.x)).toBeLessThan(0.05);
      expect(Math.abs(y - c.y)).toBeLessThan(0.05);
    }
    expect(() => toProjected(0, 0, 99999)).toThrow();
  });
});

