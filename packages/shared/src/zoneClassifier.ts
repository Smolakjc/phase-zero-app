import { GRID_SIZE, LAMBDA_NISAR_L_MM } from "./constants";

export type ZoneCategoryId =
  | "WATER"
  | "CREST"
  | "SLOPE"
  | "BERM"
  | "ABUTMENT"
  | "VEGETATION"
  | "VALLEY"
  | "HDF5";

export interface GeomorphologyCellMetrics {
  elevM: number;
  elevNorm: number;
  slopeDeg: number;
  tpiM: number;
  dzDr: number;
  dzDc: number;
  roughnessM: number;
}

export interface ClassifiedGridCell {
  zoneType: string;
  category: ZoneCategoryId;
  coherence: number;
  swW: number;
  metrics: GeomorphologyCellMetrics;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function deterministicJitter(row: number, col: number): number {
  const s = Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5; // [-0.5, +0.5]
}

/**
 * Calcula derivadas geomorfométricas locais (declividade em graus, TPI 3x3, gradiente direcional e rugosidade)
 * a partir da matriz de elevação `elevGrid`.
 */
export function computeGeomorphologyMetrics(
  elevGrid: readonly (readonly number[])[],
  row: number,
  col: number,
  minElev?: number,
  maxElev?: number,
): GeomorphologyCellMetrics {
  const rows = elevGrid.length || GRID_SIZE;
  const cols = elevGrid[0]?.length || GRID_SIZE;
  const elevM = Number(elevGrid[row]?.[col] ?? 0);

  let lo = minElev;
  let hi = maxElev;
  if (lo === undefined || hi === undefined) {
    lo = Infinity;
    hi = -Infinity;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const v = Number(elevGrid[r]?.[c] ?? 0);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
  }

  const span = Math.max((hi ?? elevM) - (lo ?? elevM), 1.0);
  const elevNorm = clamp((elevM - (lo ?? elevM)) / span, 0, 1);

  const rPrev = Math.max(0, row - 1);
  const rNext = Math.min(rows - 1, row + 1);
  const cPrev = Math.max(0, col - 1);
  const cNext = Math.min(cols - 1, col + 1);

  const dzDr =
    (Number(elevGrid[rNext]?.[col] ?? elevM) - Number(elevGrid[rPrev]?.[col] ?? elevM)) /
    Math.max(1, rNext - rPrev);
  const dzDc =
    (Number(elevGrid[row]?.[cNext] ?? elevM) - Number(elevGrid[row]?.[cPrev] ?? elevM)) /
    Math.max(1, cNext - cPrev);

  const gradMag = Math.hypot(dzDr, dzDc);
  // Escala horizontal efetiva (~13.5m de sub-malha estrutural) para conversão em graus de inclinação de talude
  const slopeDeg = Math.round((Math.atan(gradMag / 13.5) * 180) / Math.PI);

  let sumNeighbor = 0;
  let countNeighbor = 0;
  const vals: number[] = [];
  for (let rr = rPrev; rr <= rNext; rr += 1) {
    for (let cc = cPrev; cc <= cNext; cc += 1) {
      const v = Number(elevGrid[rr]?.[cc] ?? elevM);
      vals.push(v);
      if (rr !== row || cc !== col) {
        sumNeighbor += v;
        countNeighbor += 1;
      }
    }
  }

  const meanNeighbor = countNeighbor > 0 ? sumNeighbor / countNeighbor : elevM;
  const tpiM = elevM - meanNeighbor;

  const meanAll = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  const variance =
    vals.reduce((acc, v) => acc + (v - meanAll) ** 2, 0) / Math.max(1, vals.length);
  const roughnessM = Math.sqrt(variance);

  return {
    elevM,
    elevNorm,
    slopeDeg,
    tpiM,
    dzDr,
    dzDc,
    roughnessM,
  };
}

/**
 * Funde a altimetria real regional do Open-Meteo DEM (altitude média, amplitude de relevo ΔH e ondulações locais)
 * com a geometria estrutural tridimensional do barramento/encaixe de vale, evitando que a baixa resolução
 * da grade 5x5 (~350m) posicione água em topos de morro ou a crista em depressões.
 */
export function fuseRealDemWithStructure(
  rawDemGrid: readonly (readonly number[])[],
  preserveRawGrid: boolean,
): number[][] {
  if (preserveRawGrid) {
    return rawDemGrid.map((r) => [...r]);
  }

  const rows = rawDemGrid.length;
  const cols = rawDemGrid[0]?.length ?? rows;
  const center = (cols - 1) / 2.0;

  let sum = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  let count = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const v = Number(rawDemGrid[r]?.[c] ?? 500);
      sum += v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      count += 1;
    }
  }

  const meanDem = count > 0 ? sum / count : 500;
  const realSpan = clamp(maxVal - minVal, 18.0, 68.0);
  const scale = realSpan / 46.0;
  const baseAlt = meanDem - 22.0 * scale;

  const fused: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const outRow: number[] = [];
    const crestR = 25.0 * Math.exp(-((r - 6.5) ** 2) / 4.8);
    const slopeR = (rows - r) * 2.65;

    for (let c = 0; c < cols; c += 1) {
      const rawV = Number(rawDemGrid[r]?.[c] ?? meanDem);
      const demAnomaly = rawV - meanDem;
      const distCenter = Math.abs(c - center);

      // Bacia hidráulica a montante nivelada com margens laterais encaixadas
      if (r < 5 && c >= 2 && c <= cols - 3) {
        const waterLevel = baseAlt + 42.5 * scale;
        outRow.push(waterLevel + demAnomaly * 0.03);
        continue;
      }

      const crest = crestR * Math.exp(-((c - center) ** 2) / 36.0);
      // Encostas laterais (ombreiras e mata nativa) sobem nas bordas do vale
      const valleyWall =
        r >= 4 ? Math.max(0, (distCenter - 5.2) / 3.5) ** 1.6 * 11.5 : distCenter * 1.4;
      const slope = slopeR + Math.sin(c * 0.45) * 3.2 + valleyWall;
      const structElev = baseAlt + (crest + slope) * scale;

      outRow.push(structElev + demAnomaly * 0.22);
    }
    fused.push(outRow);
  }

  return fused;
}

/**
 * Classifica um pixel `(row, col)` da malha 18x18 em uma das 7 zonas geotécnicas e de cobertura
 * (`WATER`, `CREST`, `SLOPE`, `BERM`, `ABUTMENT`, `VEGETATION`, `VALLEY`) combinando posição estrutural,
 * declividade DEM em graus, índice de posição topográfica (TPI) e coerência interferométrica SAR (γ).
 */
export function classifyCustomGridCell(
  elevGrid: readonly (readonly number[])[],
  row: number,
  col: number,
  wavelengthMm = LAMBDA_NISAR_L_MM,
  minElev?: number,
  maxElev?: number,
): ClassifiedGridCell {
  const cols = elevGrid[0]?.length || GRID_SIZE;
  const center = (cols - 1) / 2.0;

  const metrics = computeGeomorphologyMetrics(elevGrid, row, col, minElev, maxElev);
  const altLabel = `${Math.round(metrics.elevM)}m`;
  const jitter = deterministicJitter(row, col);
  const isLBand = wavelengthMm > 100;
  // Banda L (~24 cm) penetra melhor no dossel vegetal do que Banda C (~5.6 cm), mantendo γ < 0.36 em mata fechada
  const bandVegBonus = isLBand ? 0.025 : 0.0;

  // 1. VEGETAÇÃO DENSA / MATA CILIAR E ENCOSTAS FLORESTADAS EXTERNAS
  // Nas bordas laterais do vale (col <= 1 ou col >= 16) e nas encostas florestadas a jusante,
  // o dossel arbóreo provoca descorrelação volumétrica no sinal InSAR (γ ~ 0.22 a 0.35).
  const isOuterForestMargin = col <= 1 || col >= cols - 2;
  const isDownstreamForestFlank =
    (row >= 13 && (col <= 3 || col >= cols - 4)) ||
    (row >= 15 && (col === 4 || col === cols - 5));

  if (isOuterForestMargin || isDownstreamForestFlank) {
    const vegSlope = Math.max(metrics.slopeDeg, 8);
    const coh = clamp(0.27 + bandVegBonus + jitter * 0.07 - metrics.roughnessM * 0.004, 0.21, 0.35);
    return {
      zoneType: `VEGETAÇÃO DENSA / MATA NATIVA (Alt: ${altLabel} · Decliv: ${vegSlope}°)`,
      category: "VEGETATION",
      coherence: Number(coh.toFixed(3)),
      swW: 0.04,
      metrics,
    };
  }

  // 2. ÁGUA DA REPRESA / RESERVATÓRIO A MONTANTE
  // Bacia hidráulica ou lagoa de decantação a montante da crista (row < 5, col 2..15):
  // reflexão especular da onda de radar causa perda severa de coerência (γ ~ 0.14 a 0.22).
  if (row < 5) {
    const waterSlope = Math.min(metrics.slopeDeg, 2);
    const coh = clamp(0.18 + jitter * 0.05, 0.14, 0.22);
    return {
      zoneType: `ÁGUA DA REPRESA / RESERVATÓRIO (Alt: ${altLabel} · Decliv: ${waterSlope}°)`,
      category: "WATER",
      coherence: Number(coh.toFixed(3)),
      swW: 0.0,
      metrics,
    };
  }

  // 3. MURETA / CRISTA PRINCIPAL (COROAMENTO DA BARRAGEM)
  // Eixo superior convexo (row 5..8, col 3..14): concreto, enrocamento ou solo compactado exposto
  // com altíssima estabilidade radiométrica (γ ~ 0.91 a 0.97).
  if (row >= 5 && row <= 8 && col >= 3 && col <= cols - 4) {
    const isRefCrest = row === 8 && col === 9;
    const coh = isRefCrest
      ? 0.94
      : clamp(0.94 + jitter * 0.03 + (metrics.tpiM > 0 ? 0.01 : -0.01), 0.91, 0.97);
    const swW = 0.55 * Math.exp(-((col - center) ** 2) / 18.0);
    return {
      zoneType: `MURETA / CRISTA PRINCIPAL (Alt: ${altLabel} · Decliv: ${metrics.slopeDeg}°)`,
      category: "CREST",
      coherence: Number(coh.toFixed(3)),
      swW,
      metrics,
    };
  }

  // 4. PAREDÃO / TALUDE CENTRAL (FACE ESTRUTURAL DE JUSANTE)
  // Face íngreme do maciço principal (row 9..12, col 4..13), onde se concentra o cisalhamento
  // e o pixel oficial de referência `px_10_9` (row 10, col 9).
  if (row >= 9 && row <= 12 && col >= 4 && col <= cols - 5) {
    const isRefTalude = row === 10 && col === 9;
    const coh = isRefTalude
      ? 0.9
      : clamp(0.9 + jitter * 0.035, 0.86, 0.93);
    const swW = Math.exp(-((row - 10.0) ** 2 + (col - center) ** 2) / 10.0);
    const taludeSlope = Math.max(metrics.slopeDeg, 18);
    return {
      zoneType: `PAREDÃO / TALUDE CENTRAL (Alt: ${altLabel} · Decliv: ${taludeSlope}°)`,
      category: "SLOPE",
      coherence: Number(coh.toFixed(3)),
      swW,
      metrics,
    };
  }

  // 5. BERMA DE PÉ / TALUDE INFERIOR E DIQUE DE DRENAGEM
  // Transição côncava na base do paredão principal (row 13, col 4..13).
  if (row === 13 && col >= 4 && col <= cols - 5) {
    const coh = clamp(0.82 + jitter * 0.04, 0.78, 0.86);
    const swW = Math.exp(-((row - 10.0) ** 2 + (col - center) ** 2) / 10.0);
    return {
      zoneType: `BERMA DE PÉ / TALUDE INFERIOR (Alt: ${altLabel} · Decliv: ${metrics.slopeDeg}°)`,
      category: "BERM",
      coherence: Number(coh.toFixed(3)),
      swW,
      metrics,
    };
  }

  // 6. OMBREIRA / ENCOSTA ROCHOSA LATERAL
  // Encontros laterais onde o maciço se apoia nas paredes naturais do vale (row 5..12, col 2..3 e 14..15).
  if (row >= 5 && row <= 12) {
    const coh = clamp(0.73 + jitter * 0.05, 0.67, 0.78);
    const abutmentSlope = Math.max(metrics.slopeDeg, 14);
    return {
      zoneType: `OMBREIRA / ENCOSTA ROCHOSA (Alt: ${altLabel} · Decliv: ${abutmentSlope}°)`,
      category: "ABUTMENT",
      coherence: Number(coh.toFixed(3)),
      swW: 0.16,
      metrics,
    };
  }

  // 7. VALE A JUSANTE / CANAL DE DRENAGEM E CAMPO EXPOSTO
  // Calha central de drenagem e planície aluvial a jusante (row 14..17, col 5..12).
  const coh = clamp(0.53 + jitter * 0.06, 0.46, 0.61);
  return {
    zoneType: `VALE A JUSANTE / DRENAGEM (Alt: ${altLabel} · Decliv: ${metrics.slopeDeg}°)`,
    category: "VALLEY",
    coherence: Number(coh.toFixed(3)),
    swW: 0.08,
    metrics,
  };
}

/**
 * Identifica a categoria estrutural/cobertura a partir do texto `zone` de qualquer pixel
 * (compatível tanto com os 4 presets históricos quanto com buscas customizadas e HDF5).
 */
export function detectZoneCategory(zone: string): ZoneCategoryId {
  const u = zone.toUpperCase();
  if (u.includes("HDF5")) return "HDF5";
  if (u.includes("ÁGUA") || u.includes("AGUA") || u.includes("RESERVATÓRIO") || u.includes("RESERVATORIO")) {
    return "WATER";
  }
  if (u.includes("MURETA") || u.includes("CRISTA")) {
    return "CREST";
  }
  if (u.includes("BERMA")) {
    return "BERM";
  }
  if (u.includes("PAREDÃO") || u.includes("PAREDAO") || u.includes("TALUDE")) {
    return "SLOPE";
  }
  if (u.includes("OMBREIRA") || u.includes("ENCOSTA")) {
    return "ABUTMENT";
  }
  if (u.includes("VEGETAÇÃO") || u.includes("VEGETACAO") || u.includes("MATA")) {
    return "VEGETATION";
  }
  return "VALLEY";
}
