/**
 * Interpolação 2D para grades regulares e upsampling de DEM (`K-B2`).
 *
 * - `bilinear2D`: equivalente a `scipy.interpolate.RegularGridInterpolator((gridY, gridX), values, bounds_error=False, fill_value=fill)`.
 * - `zoom2D`: equivalente a `scipy.ndimage.zoom(matrix, factor, order=2)` (B-spline quadrática com pré-filtro) ou `order=1` (bilinear).
 */

function findCellIndex(axis: readonly number[], coord: number): { idx: number; t: number } | null {
  const n = axis.length;
  if (n < 2) return null;
  const ascending = axis[n - 1] >= axis[0];
  const minVal = ascending ? axis[0] : axis[n - 1];
  const maxVal = ascending ? axis[n - 1] : axis[0];

  if (coord < minVal || coord > maxVal) {
    return null;
  }

  for (let i = 0; i < n - 1; i += 1) {
    const a = axis[i];
    const b = axis[i + 1];
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (coord >= lo && coord <= hi) {
      const span = b - a;
      const t = span === 0 ? 0 : (coord - a) / span;
      return { idx: i, t };
    }
  }
  return { idx: n - 2, t: 1 };
}

/**
 * Interpola bilinearmente uma lista de pontos `[y, x]` sobre a grade `(gridY, gridX, values)`.
 * Pontos fora do domínio retornam `fill` (padrão `0`).
 */
export function bilinear2D(
  gridY: readonly number[],
  gridX: readonly number[],
  values: readonly (readonly number[])[],
  points: readonly (readonly [number, number] | readonly number[])[],
  fill = 0,
): number[] {
  return points.map((pt) => {
    const y = pt[0];
    const x = pt[1];
    const cy = findCellIndex(gridY, y);
    const cx = findCellIndex(gridX, x);
    if (!cy || !cx) return fill;

    const { idx: r0, t: ty } = cy;
    const { idx: c0, t: tx } = cx;

    const v00 = values[r0]?.[c0] ?? fill;
    const v01 = values[r0]?.[c0 + 1] ?? fill;
    const v10 = values[r0 + 1]?.[c0] ?? fill;
    const v11 = values[r0 + 1]?.[c0 + 1] ?? fill;

    return (
      v00 * (1 - ty) * (1 - tx) +
      v01 * (1 - ty) * tx +
      v10 * ty * (1 - tx) +
      v11 * ty * tx
    );
  });
}

function mirrorIndex(idx: number, n: number): number {
  if (n <= 1) return 0;
  let k = idx;
  while (k < 0 || k >= n) {
    if (k < 0) k = -k;
    if (k >= n) k = 2 * (n - 1) - k;
  }
  return k;
}

/**
 * Resolve o sistema linear `0.125*c[k-1] + 0.75*c[k] + 0.125*c[k+1] = y[k]`
 * com condição de contorno espelhada (`c[-1] = c[1]`, `c[n] = c[n-2]`),
 * idêntico a `scipy.ndimage.spline_filter1d(y, order=2, mode='mirror')`.
 */
function splineFilter1DOrder2(signal: readonly number[]): number[] {
  const n = signal.length;
  if (n <= 1) return [...signal];

  // Monta matriz densa pequena (n tipicamente 5..18) e resolve por eliminação de Gauss com pivoteamento parcial
  const a: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  for (let k = 0; k < n; k += 1) {
    a[k][k] += 0.75;
    a[k][mirrorIndex(k - 1, n)] += 0.125;
    a[k][mirrorIndex(k + 1, n)] += 0.125;
    a[k][n] = signal[k];
  }

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }
    const tmp = a[col];
    a[col] = a[pivot];
    a[pivot] = tmp;

    const diag = a[col][col];
    for (let j = col; j <= n; j += 1) {
      a[col][j] /= diag;
    }
    for (let row = 0; row < n; row += 1) {
      if (row !== col) {
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) {
          a[row][j] -= factor * a[col][j];
        }
      }
    }
  }

  return a.map((row) => row[n]);
}

function splineFilter2DOrder2(matrix: readonly (readonly number[])[]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const rowFiltered = matrix.map((r) => splineFilter1DOrder2(r));
  const coeffs: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let c = 0; c < cols; c += 1) {
    const colVec = new Array<number>(rows);
    for (let r = 0; r < rows; r += 1) {
      colVec[r] = rowFiltered[r][c];
    }
    const colCoeffs = splineFilter1DOrder2(colVec);
    for (let r = 0; r < rows; r += 1) {
      coeffs[r][c] = colCoeffs[r];
    }
  }
  return coeffs;
}

/**
 * Redimensiona uma matriz 2D por um fator (`factor`), equivalente a `scipy.ndimage.zoom(matrix, factor, order)`.
 * Suporta `order = 1` (bilinear) e `order = 2` (B-spline quadrática com pré-filtro).
 */
export function zoom2D(
  matrix: readonly (readonly number[])[],
  factor: number,
  order: 1 | 2 = 2,
): number[][] {
  const inRows = matrix.length;
  const inCols = matrix[0]?.length ?? 0;
  if (inRows === 0 || inCols === 0) return [];

  const outRows = Math.max(1, Math.round(inRows * factor));
  const outCols = Math.max(1, Math.round(inCols * factor));

  if (order === 1) {
    const gridY = Array.from({ length: inRows }, (_, i) => i);
    const gridX = Array.from({ length: inCols }, (_, i) => i);
    const out: number[][] = [];
    for (let r = 0; r < outRows; r += 1) {
      const y = outRows > 1 ? (r * (inRows - 1)) / (outRows - 1) : 0;
      const rowPts: [number, number][] = [];
      for (let c = 0; c < outCols; c += 1) {
        const x = outCols > 1 ? (c * (inCols - 1)) / (outCols - 1) : 0;
        rowPts.push([y, x]);
      }
      out.push(bilinear2D(gridY, gridX, matrix, rowPts, 0));
    }
    return out;
  }

  const coeffs = splineFilter2DOrder2(matrix);
  const out: number[][] = Array.from({ length: outRows }, () => new Array<number>(outCols).fill(0));

  for (let r = 0; r < outRows; r += 1) {
    const y = outRows > 1 ? (r * (inRows - 1)) / (outRows - 1) : 0;
    const ky = Math.floor(y + 0.5);
    const ty = y - ky;
    const wy = [0.5 * (0.5 - ty) ** 2, 0.75 - ty ** 2, 0.5 * (0.5 + ty) ** 2];

    for (let c = 0; c < outCols; c += 1) {
      const x = outCols > 1 ? (c * (inCols - 1)) / (outCols - 1) : 0;
      const kx = Math.floor(x + 0.5);
      const tx = x - kx;
      const wx = [0.5 * (0.5 - tx) ** 2, 0.75 - tx ** 2, 0.5 * (0.5 + tx) ** 2];

      let sum = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const rr = mirrorIndex(ky + dy, inRows);
        const wyVal = wy[dy + 1];
        for (let dx = -1; dx <= 1; dx += 1) {
          const cc = mirrorIndex(kx + dx, inCols);
          sum += wyVal * wx[dx + 1] * coeffs[rr][cc];
        }
      }
      out[r][c] = sum;
    }
  }

  return out;
}

