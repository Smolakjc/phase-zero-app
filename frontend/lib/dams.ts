import {
  DamCatalogItem,
  DamsResponseSchema,
  toDamCatalogItems,
} from "@phase-zero/shared";

/**
 * Catálogo inicial de barragens brasileiras (ativas, em descaracterização e rompidas/históricas)
 * importado diretamente de `@phase-zero/shared` para 100% de paridade com o backend.
 */
export const FALLBACK_DAMS: DamCatalogItem[] = toDamCatalogItems();

/**
 * Busca a lista de barragens no backend (`/api/dams`) com fallback imediato para `FALLBACK_DAMS`.
 */
export async function fetchDamCatalog(
  apiBaseUrl: string,
  signal?: AbortSignal,
): Promise<DamCatalogItem[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/dams`, { signal });
    if (!res.ok) return FALLBACK_DAMS;
    const raw: unknown = await res.json();
    const parsed = DamsResponseSchema.safeParse(raw);
    return parsed.success && parsed.data.dams.length > 0 ? parsed.data.dams : FALLBACK_DAMS;
  } catch {
    return FALLBACK_DAMS;
  }
}

/**
 * Encontra a barragem do catálogo mais próxima da coordenada informada (dentro de 0.035 grau).
 */
export function findDamByCoords(
  dams: readonly DamCatalogItem[],
  lat: number,
  lon: number,
): DamCatalogItem | null {
  let best: DamCatalogItem | null = null;
  let bestDist = Infinity;
  for (const dam of dams) {
    const dLat = Math.abs(lat - dam.lat);
    const dLon = Math.abs(lon - dam.lon);
    if (dLat > 0.035 || dLon > 0.035) continue;
    const d = Math.hypot(dLat, dLon);
    if (d <= 0.035 && d < bestDist) {
      bestDist = d;
      best = dam;
    }
  }
  return best;
}
