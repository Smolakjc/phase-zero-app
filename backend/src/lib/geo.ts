import proj4 from "proj4";

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Gera a string de definição proj4 para códigos EPSG UTM Norte (32601..32660),
 * UTM Sul (32701..32760), WGS84 (4326) e Web Mercator (3857).
 */
export function getProj4Definition(epsg: number): string {
  if (epsg >= 32601 && epsg <= 32660) {
    const zone = epsg - 32600;
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  }
  if (epsg >= 32701 && epsg <= 32760) {
    const zone = epsg - 32700;
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
  }
  if (epsg === 4326) {
    return "EPSG:4326";
  }
  if (epsg === 3857) {
    return "EPSG:3857";
  }
  throw new Error(`Código EPSG não suportado: EPSG:${epsg}`);
}

/**
 * Reprojeta `(lat, lon)` em graus WGS84 (`EPSG:4326`) para `(x, y)` no CRS `EPSG:<epsg>`.
 * Equivalente a `Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True).transform(lon, lat)`.
 */
export function toProjected(lat: number, lon: number, epsg: number): ProjectedPoint {
  const def = getProj4Definition(epsg);
  const [x, y] = proj4("EPSG:4326", def, [lon, lat]);
  return { x, y };
}

