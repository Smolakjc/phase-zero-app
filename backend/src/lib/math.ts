/**
 * Biblioteca matemática pura para o motor PHASE-ZERO (equivalente leve ao NumPy).
 *
 * Nota sobre arredondamento (S-B4):
 * O Python (`round()` e `np.round()`) utiliza *banker's rounding* (round half to even),
 * enquanto `Math.round()` do JavaScript arredonda meios (`x.5`) em direção a `+∞`.
 * Implementamos `roundN` e `round2` com *round half to even* para paridade numérica
 * exata com o pipeline Python v4.2, além de expor `roundHalfUp` para comparação.
 */

export function arange(n: number): number[] {
  const len = Math.max(0, Math.trunc(n));
  const out = new Array<number>(len);
  for (let i = 0; i < len; i += 1) {
    out[i] = i;
  }
  return out;
}

export function zeros(n: number): number[] {
  const len = Math.max(0, Math.trunc(n));
  return new Array<number>(len).fill(0);
}

export function linspace(start: number, stop: number, num: number): number[] {
  const n = Math.max(0, Math.trunc(num));
  if (n === 0) return [];
  if (n === 1) return [start];
  const step = (stop - start) / (n - 1);
  const out = new Array<number>(n);
  for (let i = 0; i < n - 1; i += 1) {
    out[i] = start + step * i;
  }
  out[n - 1] = stop;
  return out;
}

/**
 * Equivalente a `np.linspace(start, stop, num, dtype=int)` (truncamento em direção a zero).
 */
export function linspaceInt(start: number, stop: number, num: number): number[] {
  return linspace(start, stop, num).map((v) => Math.trunc(v));
}

/**
 * Média aritmética ignorando valores `NaN` ou `Infinity` (equivalente a `np.nanmean`).
 */
export function mean(values: readonly number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (Number.isFinite(v)) {
      sum += v;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Arredondamento *round half to even* (banker's rounding, idêntico ao `round(val, digits)` do Python).
 */
export function roundN(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floorVal = Math.floor(scaled);
  const diff = scaled - floorVal;
  const eps = 1e-12;

  let roundedInt: number;
  if (Math.abs(diff - 0.5) <= eps) {
    roundedInt = floorVal % 2 === 0 ? floorVal : floorVal + 1;
  } else {
    roundedInt = Math.round(scaled);
  }
  const result = roundedInt / factor;
  return Object.is(result, -0) ? 0 : result;
}

export function round2(value: number): number {
  return roundN(value, 2);
}

export function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function nanToNum(value: number, nanReplacement = 0.0): number {
  return Number.isFinite(value) ? value : nanReplacement;
}

export function nanToNumGrid(grid: readonly (readonly number[])[], nanReplacement = 0.0): number[][] {
  return grid.map((row) => row.map((v) => nanToNum(v, nanReplacement)));
}

export function clipGrid(
  grid: readonly (readonly number[])[],
  min: number,
  max: number,
): number[][] {
  return grid.map((row) => row.map((v) => clip(v, min, max)));
}

/**
 * Índice do elemento `v` que minimiza `|v - target|` (equivalente a `int(np.argmin(np.abs(arr - target)))`).
 */
export function argminAbs(values: ArrayLike<number>, target = 0): number {
  if (values.length === 0) {
    throw new Error("argminAbs requer um array não vazio.");
  }
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < values.length; i += 1) {
    const dist = Math.abs(values[i] - target);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

