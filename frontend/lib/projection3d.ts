import { GridPixel } from "@phase-zero/shared";

/**
 * Funções puras de projeção isométrica/perspectiva 3D, construção de malha,
 * ordenação por profundidade (painter's algorithm) e hit-test (`K-F1`).
 * Derivam as dimensões da grade a partir dos próprios dados (sem 18 ou 8.5 fixos).
 */

export interface GridDimensions {
  rows: number;
  cols: number;
  centerRow: number;
  centerCol: number;
  minElev: number;
  maxElev: number;
  meanElev: number;
  elevSpan: number;
}

export interface ProjectionParams {
  width: number;
  height: number;
  azimuthDeg: number;
  pitchDeg: number;
  dims: GridDimensions;
  cellSpacingPx?: number;
  zScalePx?: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

export interface ProjectedPixelNode extends ProjectedPoint {
  px: GridPixel;
}

export interface MeshSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  masked: boolean;
}

export function deriveGridDimensions(pixels: readonly GridPixel[]): GridDimensions {
  if (pixels.length === 0) {
    return {
      rows: 1,
      cols: 1,
      centerRow: 0,
      centerCol: 0,
      minElev: 0,
      maxElev: 12,
      meanElev: 6,
      elevSpan: 12,
    };
  }

  let maxRow = 0;
  let maxCol = 0;
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let i = 0; i < pixels.length; i += 1) {
    const p = pixels[i];
    if (p.row > maxRow) maxRow = p.row;
    if (p.col > maxCol) maxCol = p.col;
    if (p.elevation_m < minElev) minElev = p.elevation_m;
    if (p.elevation_m > maxElev) maxElev = p.elevation_m;
  }

  const rows = maxRow + 1;
  const cols = maxCol + 1;
  const centerRow = (rows - 1) / 2.0;
  const centerCol = (cols - 1) / 2.0;
  const meanElev = (minElev + maxElev) / 2.0;
  const elevSpan = Math.max(maxElev - minElev, 12.0);

  return {
    rows,
    cols,
    centerRow,
    centerCol,
    minElev,
    maxElev,
    meanElev,
    elevSpan,
  };
}

export function project3D(
  row: number,
  col: number,
  elev: number,
  params: ProjectionParams,
): ProjectedPoint {
  const { width, height, azimuthDeg, pitchDeg, dims } = params;
  const spacing =
    params.cellSpacingPx ??
    Math.min(23, Math.min(width / (dims.cols * 1.65), height / (dims.rows * 1.15)));
  const zScale = params.zScalePx ?? 95.0;

  const cx = width / 2.0;
  const cy = height / 2.0 + 25.0;
  const az = (azimuthDeg * Math.PI) / 180.0;
  const pitch = (pitchDeg * Math.PI) / 180.0;

  const x0 = (col - dims.centerCol) * spacing;
  const y0 = (row - dims.centerRow) * spacing;
  const zNorm = ((elev - dims.meanElev) / dims.elevSpan) * zScale;

  const xr = x0 * Math.cos(az) - y0 * Math.sin(az);
  const yr = x0 * Math.sin(az) + y0 * Math.cos(az);

  const screenX = cx + xr;
  const screenY = cy + yr * Math.cos(pitch) - zNorm * Math.sin(pitch);
  const depth = yr * Math.sin(pitch) + zNorm * Math.cos(pitch);

  return { x: screenX, y: screenY, depth };
}

export function buildMesh(
  pixels: readonly GridPixel[],
  params: ProjectionParams,
): {
  nodes: ProjectedPixelNode[];
  segments: MeshSegment[];
} {
  const gridMap = new Map<string, ProjectedPixelNode>();
  const nodes: ProjectedPixelNode[] = [];

  for (let i = 0; i < pixels.length; i += 1) {
    const px = pixels[i];
    const pt = project3D(px.row, px.col, px.elevation_m, params);
    const node: ProjectedPixelNode = { ...pt, px };
    gridMap.set(`${px.row}_${px.col}`, node);
    nodes.push(node);
  }

  const segments: MeshSegment[] = [];
  const { rows, cols } = params.dims;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const curr = gridMap.get(`${r}_${c}`);
      if (!curr) continue;

      if (c + 1 < cols) {
        const right = gridMap.get(`${r}_${c + 1}`);
        if (right) {
          segments.push({
            x1: curr.x,
            y1: curr.y,
            x2: right.x,
            y2: right.y,
            masked: curr.px.masked,
          });
        }
      }

      if (r + 1 < rows) {
        const down = gridMap.get(`${r + 1}_${c}`);
        if (down) {
          segments.push({
            x1: curr.x,
            y1: curr.y,
            x2: down.x,
            y2: down.y,
            masked: curr.px.masked,
          });
        }
      }
    }
  }

  return { nodes, segments };
}

export function sortByDepth(nodes: readonly ProjectedPixelNode[]): ProjectedPixelNode[] {
  return [...nodes].sort((a, b) => a.depth - b.depth);
}

export function hitTest(
  nodes: readonly ProjectedPixelNode[],
  clickX: number,
  clickY: number,
  maxDistancePx = 22,
): GridPixel | null {
  let closest: GridPixel | null = null;
  let minDist = maxDistancePx;

  for (let i = 0; i < nodes.length; i += 1) {
    const pt = nodes[i];
    const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
    if (dist < minDist) {
      minDist = dist;
      closest = pt.px;
    }
  }

  return closest;
}

