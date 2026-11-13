import {
  DamCatalogItem,
  KNOWN_DAM_SITES_CATALOG,
  KnownDamSiteDefinition,
  LAMBDA_NISAR_L_MM,
  LAMBDA_SENTINEL_C_MM,
  LosVector,
  ScenarioItem,
  toDamCatalogItems,
} from "@phase-zero/shared";

export interface Preset extends ScenarioItem {
  anomaly_rate_mm_per_step: number;
  accel_factor: number;
}

export const PRESET_EXAMPLES: Record<string, Preset> = {
  itaipu_normal: {
    id: "itaipu_normal",
    label: "🟢 Itaipu (PR) - Estável",
    name: "Exemplo 1: Usina de Itaipu (Foz do Iguaçu, PR)",
    sensor: "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
    wavelength_mm: LAMBDA_NISAR_L_MM,
    lat: -25.408,
    lon: -54.588,
    los_vector: {
      losUnitVectorX: -0.62,
      losUnitVectorY: -0.14,
      incidenceAngle: 38.5,
      elevationAngle: 51.5,
    },
    anomaly_rate_mm_per_step: 0.0,
    accel_factor: 0.0,
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  gongo_soco_active: {
    id: "gongo_soco_active",
    label: "🟡 Gongo Soco (MG) - Ativa",
    name: "Exemplo 2: Talude Gongo Soco / Sul Superior (Barão de Cocais, MG)",
    sensor: "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
    wavelength_mm: LAMBDA_NISAR_L_MM,
    lat: -19.963,
    lon: -43.593,
    los_vector: {
      losUnitVectorX: -0.58,
      losUnitVectorY: -0.12,
      incidenceAngle: 36.2,
      elevationAngle: 53.8,
    },
    anomaly_rate_mm_per_step: -0.92,
    accel_factor: -0.005,
    regime_info: "Deformação Residual Lenta e Contínua sem Aceleração Crítica (🟡 Amarelo)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  maceio_subsidence: {
    id: "maceio_subsidence",
    label: "🔴 Maceió (AL) - Subsidência",
    name: "Exemplo 3: Subsidência Mutange/Pinheiro (Maceió, AL)",
    sensor: "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
    wavelength_mm: LAMBDA_NISAR_L_MM,
    lat: -9.632,
    lon: -35.748,
    los_vector: {
      losUnitVectorX: -0.6,
      losUnitVectorY: -0.11,
      incidenceAngle: 37.0,
      elevationAngle: 53.0,
    },
    anomaly_rate_mm_per_step: -1.55,
    accel_factor: -0.065,
    regime_info: "Afundamento Urbano em Aceleração Progressiva (🔴 Vermelho)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  brumadinho_hist: {
    id: "brumadinho_hist",
    label: "🔴 Brumadinho (2018-2019)",
    name: "Exemplo 4: Histórico Barragem B1 (Brumadinho, MG - 2018/2019)",
    sensor: "ARIA-S1-GUNW / OPERA DISP-S1 (Banda C, λ=55.5mm)",
    wavelength_mm: LAMBDA_SENTINEL_C_MM,
    lat: -20.119,
    lon: -44.121,
    los_vector: {
      losUnitVectorX: 0.61,
      losUnitVectorY: -0.13,
      incidenceAngle: 37.8,
      elevationAngle: 52.2,
    },
    anomaly_rate_mm_per_step: -1.95,
    accel_factor: -0.14,
    regime_info: "Série Histórica Retro-Forense com Aceleração Precursora (🔴 Vermelho)",
    default_start: "2018-07-01",
    default_end: "2019-01-20",
  },
};

export const DEFAULT_CUSTOM_LOS_VECTOR: LosVector = {
  losUnitVectorX: -0.6,
  losUnitVectorY: -0.13,
  incidenceAngle: 37.5,
  elevationAngle: 52.5,
};

export type KnownDamSite = KnownDamSiteDefinition;

/**
 * Catálogo georreferenciado de barragens brasileiras (ativas, em descaracterização e históricas/rompidas)
 * compartilhado a partir de `@phase-zero/shared`.
 */
export const KNOWN_DAM_SITES: readonly KnownDamSite[] = KNOWN_DAM_SITES_CATALOG;

export function listDamCatalogItems(): DamCatalogItem[] {
  return toDamCatalogItems(KNOWN_DAM_SITES);
}

export function matchKnownDamSite(
  lat: number,
  lon: number,
  customName?: string | null,
): KnownDamSite | null {
  const normName = (customName ?? "").toLowerCase().trim();

  // 1. Busca por proximidade geográfica direta com filtro rápido de bounding-box (O(N) em ~2 microssegundos)
  let bestSite: KnownDamSite | null = null;
  let bestDist = Infinity;
  for (const site of KNOWN_DAM_SITES) {
    const dLat = Math.abs(lat - site.lat);
    const dLon = Math.abs(lon - site.lon);
    if (dLat > site.radiusDeg || dLon > site.radiusDeg) continue;
    const dist = Math.hypot(dLat, dLon);
    if (dist <= site.radiusDeg && dist < bestDist) {
      bestDist = dist;
      bestSite = site;
    }
  }
  if (bestSite) {
    return bestSite;
  }

  // 2. Busca por palavra-chave no nome apenas quando a coordenada também está próxima da estrutura (<= 0.2 grau),
  // evitando que o nome anterior/default no campo Alvo mascare coordenadas livres do usuário.
  if (normName.length > 2) {
    for (const site of KNOWN_DAM_SITES) {
      if (Math.abs(lat - site.lat) > 0.2 || Math.abs(lon - site.lon) > 0.2) continue;
      const dist = Math.hypot(lat - site.lat, lon - site.lon);
      if (dist > 0.2) continue;
      if (site.keywords.some((kw) => normName.includes(kw))) {
        return site;
      }
    }
  }

  return null;
}

export function getPresetOrDefault(scenarioId: string): Preset {
  return PRESET_EXAMPLES[scenarioId] ?? PRESET_EXAMPLES.gongo_soco_active;
}

export function listScenarioItems(): ScenarioItem[] {
  return Object.values(PRESET_EXAMPLES).map(
    ({
      id,
      label,
      name,
      sensor,
      wavelength_mm,
      lat,
      lon,
      los_vector,
      regime_info,
      default_start,
      default_end,
    }) => ({
      id,
      label,
      name,
      sensor,
      wavelength_mm,
      lat,
      lon,
      los_vector,
      regime_info,
      default_start,
      default_end,
    }),
  );
}
