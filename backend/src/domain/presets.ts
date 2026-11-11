import {
  DamCatalogItem,
  DamPhysicalStatus,
  LAMBDA_NISAR_L_MM,
  LAMBDA_SENTINEL_C_MM,
  LosVector,
  ScenarioItem,
  StatusCode,
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
      losUnitVectorX: -0.60,
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

export interface KnownDamSite {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  radiusDeg: number;
  keywords: string[];
  physical_status: DamPhysicalStatus;
  physical_status_label: string;
  risk_tier: StatusCode;
  default_start: string;
  default_end: string;
  anomaly_rate_mm_per_step: number;
  accel_factor: number;
  regime_info: string;
}

/**
 * Catálogo georreferenciado de barragens brasileiras (ativas, em descaracterização e históricas/rompidas)
 * e estruturas de referência para reconhecimento automático por coordenadas, nome ou clique no mapa.
 */
export const KNOWN_DAM_SITES: readonly KnownDamSite[] = [
  {
    id: "sul_superior_gongo_soco",
    name: "Barragem Sul Superior / Mina Gongo Soco (Barão de Cocais, MG)",
    location: "Barão de Cocais, MG",
    lat: -19.9419,
    lon: -43.5997,
    radiusDeg: 0.06,
    keywords: ["sul superior", "gongo soco", "barao de cocais", "barão de cocais"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM Nível 3)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.85,
    accel_factor: -0.11,
    regime_info: "Alerta ANM Nível 3: Deformação Crítica no Talude / Crista (🔴 Risco de Ruptura)",
  },
  {
    id: "b3_b4_maravilhas",
    name: "Barragem B3/B4 - Mina Maravilhas (Nova Lima / Macacos, MG)",
    location: "Nova Lima / Macacos, MG",
    lat: -20.0361,
    lon: -43.9631,
    radiusDeg: 0.055,
    keywords: ["b3/b4", "b3", "b4", "maravilhas", "macacos"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM Nível 3)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.74,
    accel_factor: -0.095,
    regime_info: "Alerta ANM Nível 3: Barragem B3/B4 em Emergência Crítica (🔴 Risco de Ruptura)",
  },
  {
    id: "forquilha_ouro_preto",
    name: "Barragens Forquilha I, II, III e Grupo (Ouro Preto, MG)",
    location: "Ouro Preto, MG",
    lat: -20.2442,
    lon: -43.8542,
    radiusDeg: 0.06,
    keywords: ["forquilha", "mina fabrica", "mina fábrica", "grupo"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM Nível 3)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.82,
    accel_factor: -0.105,
    regime_info: "Alerta ANM Nível 3: Complexo Forquilha em Emergência (🔴 Risco de Ruptura)",
  },
  {
    id: "serra_azul_itatiaiucu",
    name: "Barragem Serra Azul (Itatiaiuçu, MG)",
    location: "Itatiaiuçu, MG",
    lat: -20.1181,
    lon: -44.4172,
    radiusDeg: 0.06,
    keywords: ["serra azul", "itatiaiucu", "itatiaiuçu"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM Nível 3)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.68,
    accel_factor: -0.088,
    regime_info: "Alerta ANM Nível 3: Barragem Serra Azul em Emergência (🔴 Risco de Ruptura)",
  },
  {
    id: "xingu_mariana",
    name: "Barragem Xingu / Complexo Alegria e Germano (Mariana, MG)",
    location: "Mariana, MG",
    lat: -20.1653,
    lon: -43.5131,
    radiusDeg: 0.075,
    keywords: ["xingu", "alegria", "germano", "samarco"],
    physical_status: "standing",
    physical_status_label: "De pé (Alerta ANM Nível 2/3)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.88,
    accel_factor: -0.115,
    regime_info: "Alerta ANM Nível 2/3: Instabilidade Geotécnica no Maciço (🔴 Risco Severo)",
  },
  {
    id: "fundao_mariana_2015",
    name: "Barragem do Fundão (Mariana, MG - Histórico 2015)",
    location: "Mariana, MG",
    lat: -20.1992,
    lon: -43.4903,
    radiusDeg: 0.035,
    keywords: ["fundao", "fundão", "mariana 2015", "bento rodrigues"],
    physical_status: "collapsed",
    physical_status_label: "Rompida (05/11/2015)",
    risk_tier: "RED",
    default_start: "2015-05-01",
    default_end: "2015-11-04",
    anomaly_rate_mm_per_step: -1.92,
    accel_factor: -0.13,
    regime_info: "Série Histórica Forense Pré-Ruptura (Nov/2015) com Aceleração Crítica (🔴 Vermelho)",
  },
  {
    id: "doutor_timbopeba",
    name: "Barragem do Doutor / Timbopeba (Ouro Preto, MG)",
    location: "Ouro Preto, MG",
    lat: -20.3042,
    lon: -43.4831,
    radiusDeg: 0.06,
    keywords: ["doutor", "timbopeba", "antonio pereira", "antônio pereira"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.60,
    accel_factor: -0.078,
    regime_info: "Alerta ANM: Deformação em Aceleração no Maciço Principal (🔴 Vermelho)",
  },
  {
    id: "brumadinho_b1",
    name: "Barragem B1 - Córrego do Feijão (Brumadinho, MG)",
    location: "Brumadinho, MG",
    lat: -20.119,
    lon: -44.121,
    radiusDeg: 0.055,
    keywords: ["brumadinho", "feijao", "feijão", "barragem b1"],
    physical_status: "collapsed",
    physical_status_label: "Rompida (25/01/2019)",
    risk_tier: "RED",
    default_start: "2018-07-01",
    default_end: "2019-01-20",
    anomaly_rate_mm_per_step: -1.95,
    accel_factor: -0.14,
    regime_info: "Histórico Precursor Crítico de Ruptura por Liquefação (🔴 Vermelho)",
  },
  {
    id: "vargem_grande",
    name: "Barragem Vargem Grande / Capitão do Mato (Nova Lima, MG)",
    location: "Nova Lima, MG",
    lat: -20.1389,
    lon: -43.9431,
    radiusDeg: 0.05,
    keywords: ["vargem grande", "aboboras", "abóboras", "capitao do mato", "capitão do mato"],
    physical_status: "decommissioning",
    physical_status_label: "Em descaracterização (ANM)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.52,
    accel_factor: -0.068,
    regime_info: "Alerta Geotécnico ANM: Recalque Diferencial no Talude (🔴 Vermelho)",
  },
  {
    id: "b2_auxiliar_rio_acima",
    name: "Barragem B2 Auxiliar / Rio Acima (MG)",
    location: "Rio Acima, MG",
    lat: -20.068,
    lon: -43.835,
    radiusDeg: 0.05,
    keywords: ["b2 auxiliar", "b2", "rio acima"],
    physical_status: "standing",
    physical_status_label: "De pé (Alerta ANM)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.58,
    accel_factor: -0.075,
    regime_info: "Alerta ANM: Anomalia Persistente com Aceleração no Talude (🔴 Vermelho)",
  },
  {
    id: "complexo_pontal_itabira",
    name: "Complexo Pontal / Conceição / Cambucal (Itabira, MG)",
    location: "Itabira, MG",
    lat: -19.65,
    lon: -43.22,
    radiusDeg: 0.065,
    keywords: ["pontal", "itabira", "conceicao", "conceição", "cambucal"],
    physical_status: "standing",
    physical_status_label: "De pé (Monitoramento Especial)",
    risk_tier: "YELLOW",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.18,
    accel_factor: -0.02,
    regime_info: "Monitoramento Geotécnico Especial: Deformação Contínua (🟡 Amarelo)",
  },
  {
    id: "casa_de_pedra_congonhas",
    name: "Barragem Casa de Pedra (Congonhas, MG)",
    location: "Congonhas, MG",
    lat: -20.49,
    lon: -43.858,
    radiusDeg: 0.055,
    keywords: ["casa de pedra", "congonhas"],
    physical_status: "standing",
    physical_status_label: "De pé (Alta Prioridade)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.32,
    accel_factor: -0.042,
    regime_info: "Monitoramento Geotécnico de Alta Prioridade (🟡 Amarelo / 🔴 Limiar)",
  },
  {
    id: "laranjeiras_brucutu",
    name: "Barragem Laranjeiras / Brucutu (São Gonçalo do Rio Abaixo, MG)",
    location: "São Gonçalo do Rio Abaixo, MG",
    lat: -19.865,
    lon: -43.375,
    radiusDeg: 0.06,
    keywords: ["laranjeiras", "brucutu", "sao goncalo", "são gonçalo"],
    physical_status: "standing",
    physical_status_label: "De pé (Monitoramento)",
    risk_tier: "YELLOW",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -0.96,
    accel_factor: -0.015,
    regime_info: "Alerta ANM: Deformação Residual Lenta e Contínua (🟡 Amarelo)",
  },
  {
    id: "mares_ii_belo_vale",
    name: "Barragem Marés II / Santana (Belo Vale / Itabirito, MG)",
    location: "Belo Vale / Itabirito, MG",
    lat: -20.385,
    lon: -43.912,
    radiusDeg: 0.06,
    keywords: ["mares ii", "marés", "belo vale", "santana"],
    physical_status: "standing",
    physical_status_label: "De pé (Alerta ANM)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.49,
    accel_factor: -0.062,
    regime_info: "Alerta Geotécnico ANM: Anomalia Escalante na Crista/Talude (🔴 Vermelho)",
  },
  {
    id: "barragem_14_de_julho",
    name: "Barragem 14 de Julho / Castro Alves (Cotiporã / Bento Gonçalves, RS)",
    location: "Cotiporã / Bento Gonçalves, RS",
    lat: -29.065,
    lon: -51.674,
    radiusDeg: 0.07,
    keywords: ["14 de julho", "cotipora", "cotiporã", "bento goncalves", "bento gonçalves"],
    physical_status: "collapsed",
    physical_status_label: "Rompida parcialmente (02/05/2024)",
    risk_tier: "RED",
    default_start: "2023-11-01",
    default_end: "2024-05-01",
    anomaly_rate_mm_per_step: -1.78,
    accel_factor: -0.098,
    regime_info: "Emergência Hidrológica-Geotécnica: Sobrecarga Severa no Talude (🔴 Vermelho)",
  },
  {
    id: "barragem_jati_ce",
    name: "Barragem de Jati / Cinturão das Águas (Jati, CE)",
    location: "Jati, CE",
    lat: -7.702,
    lon: -38.972,
    radiusDeg: 0.06,
    keywords: ["jati", "atalho", "castanhao", "castanhão"],
    physical_status: "standing",
    physical_status_label: "De pé (Alerta SNISB)",
    risk_tier: "YELLOW",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.12,
    accel_factor: -0.025,
    regime_info: "Alerta Estrutural SNISB: Deformação Residual no Maciço (🟡 Amarelo)",
  },
  {
    id: "maceio_mutange",
    name: "Subsidência Mutange / Pinheiro / Bebedouro (Maceió, AL)",
    location: "Maceió, AL",
    lat: -9.632,
    lon: -35.748,
    radiusDeg: 0.055,
    keywords: ["maceio", "maceió", "mutange", "pinheiro", "bebedouro", "braskem"],
    physical_status: "standing",
    physical_status_label: "Área urbana monitorada (Subsidência)",
    risk_tier: "RED",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -1.55,
    accel_factor: -0.065,
    regime_info: "Afundamento Urbano em Aceleração Progressiva (🔴 Vermelho)",
  },
  {
    id: "itaipu_pr",
    name: "Usina Hidrelétrica de Itaipu (Foz do Iguaçu, PR)",
    location: "Foz do Iguaçu, PR",
    lat: -25.408,
    lon: -54.588,
    radiusDeg: 0.06,
    keywords: ["itaipu", "foz do iguacu", "foz do iguaçu"],
    physical_status: "standing",
    physical_status_label: "De pé (Operação Normal)",
    risk_tier: "GREEN",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: 0.0,
    accel_factor: 0.0,
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
  },
  {
    id: "tucurui_pa",
    name: "Usina Hidrelétrica de Tucuruí (Tucuruí, PA)",
    location: "Tucuruí, PA",
    lat: -3.8322,
    lon: -49.6471,
    radiusDeg: 0.07,
    keywords: ["tucurui", "tucuruí", "tocantins"],
    physical_status: "standing",
    physical_status_label: "De pé (Operação Normal)",
    risk_tier: "GREEN",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -0.05,
    accel_factor: 0.0,
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
  },
  {
    id: "sobradinho_ba",
    name: "Barragem / UHE de Sobradinho (Sobradinho, BA)",
    location: "Sobradinho, BA",
    lat: -9.4253,
    lon: -40.825,
    radiusDeg: 0.07,
    keywords: ["sobradinho", "sao francisco", "são francisco"],
    physical_status: "standing",
    physical_status_label: "De pé (Operação Normal)",
    risk_tier: "GREEN",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -0.06,
    accel_factor: 0.0,
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
  },
  {
    id: "furnas_mg",
    name: "Usina Hidrelétrica de Furnas (São José da Barra, MG)",
    location: "São José da Barra, MG",
    lat: -20.6697,
    lon: -46.3181,
    radiusDeg: 0.06,
    keywords: ["furnas", "sao jose da barra", "são josé da barra", "capitólio", "capitolio"],
    physical_status: "standing",
    physical_status_label: "De pé (Operação Normal)",
    risk_tier: "GREEN",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
    anomaly_rate_mm_per_step: -0.04,
    accel_factor: 0.0,
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
  },
];

export function listDamCatalogItems(): DamCatalogItem[] {
  return KNOWN_DAM_SITES.map((site) => ({
    id: site.id,
    name: site.name,
    location: site.location,
    lat: site.lat,
    lon: site.lon,
    physical_status: site.physical_status,
    physical_status_label: site.physical_status_label,
    risk_tier: site.risk_tier,
    default_start: site.default_start,
    default_end: site.default_end,
    regime_info: site.regime_info,
    keywords: [...site.keywords],
  }));
}

export function matchKnownDamSite(
  lat: number,
  lon: number,
  customName?: string | null,
): KnownDamSite | null {
  const normName = (customName ?? "").toLowerCase().trim();

  // 1. Busca por proximidade geográfica direta (coordenada da barragem)
  let bestSite: KnownDamSite | null = null;
  let bestDist = Infinity;
  for (const site of KNOWN_DAM_SITES) {
    const dist = Math.hypot(lat - site.lat, lon - site.lon);
    if (dist <= site.radiusDeg && dist < bestDist) {
      bestDist = dist;
      bestSite = site;
    }
  }
  if (bestSite) {
    return bestSite;
  }

  // 2. Busca por palavra-chave no nome (exceto o default "Usina de Itaipu" quando a coordenada mudou)
  if (normName.length > 2) {
    for (const site of KNOWN_DAM_SITES) {
      const isItaipuDefault =
        site.keywords.includes("itaipu") && Math.hypot(lat - site.lat, lon - site.lon) > 0.2;
      if (isItaipuDefault) continue;
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

