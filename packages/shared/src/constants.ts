/**
 * Constantes físicas, geométricas e limiares calibrados do PHASE-ZERO v5.0.
 */

/** Comprimento de onda do radar NISAR Banda L (~24 cm) em milímetros. */
export const LAMBDA_NISAR_L_MM = 238.4;

/** Comprimento de onda do radar Sentinel-1 Banda C (~5.6 cm) em milímetros. */
export const LAMBDA_SENTINEL_C_MM = 55.5;

/** Fator de conversão de fase desenrolada (rad) para deslocamento LOS (mm) na Banda L. */
export const PHASE_TO_MM_NISAR_L = -LAMBDA_NISAR_L_MM / (4.0 * Math.PI);

/** Dimensão lateral da malha quadrada de pixels (18×18 = 324 blocos de 80m×80m). */
export const GRID_SIZE = 18;

/** Passo angular aproximado (~80 m) em graus de latitude/longitude por pixel. */
export const PIXEL_STEP_DEG = 0.00072;

/** ID do pixel de referência no talude central usado para as 3 métricas oficiais. */
export const REFERENCE_PIXEL_ROW = 10;
export const REFERENCE_PIXEL_COL = 9;
export const REFERENCE_PIXEL_ID = `px_${REFERENCE_PIXEL_ROW}_${REFERENCE_PIXEL_COL}`;

/** Limiares calibrados de classificação em 3 níveis (Verde / Amarelo / Vermelho). */
export const CLASSIFICATION_THRESHOLDS = {
  /** |Velocidade| < 0.35 mm/ciclo para regime Verde. */
  GREEN_MAX_SLOPE_MM_PER_PASS: 0.35,
  /** Score < 5.0 para regime Verde. */
  GREEN_MAX_SCORE: 5.0,
  /** |Velocidade| < 1.45 mm/ciclo para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_SLOPE_MM_PER_PASS: 1.45,
  /** |Aceleração| < 4.5 mm para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_ACCEL_MM: 4.5,
  /** Score < 20.0 para regime Amarelo (acima disso é Vermelho). */
  YELLOW_MAX_SCORE: 20.0,
} as const;

/** Limiares de coloração visual por pixel na malha 3D (residual em mm). */
export const PIXEL_RESIDUAL_THRESHOLDS_MM = {
  GREEN_MAX_ABS_MM: 3.5,
  RED_MIN_ABS_MM: 18.0,
} as const;

/** Coleções consultadas no NASA CMR. */
export const CMR_SHORT_NAMES = [
  "NISAR_L2_GUNW_PROVISIONAL_V1",
  "NISAR_L2_GUNW_BETA_V1",
  "OPERA_L3_DISP-S1_V1",
  "ARIA_S1_GUNW",
] as const;

/** Aviso oficial exibido no rodapé e retornado pela API. */
export const OFFICIAL_DISCLAIMER =
  "Satellite InSAR is a broad-area monitoring and triage layer, " +
  "not a standalone structural safety system. Uses NISAR Provisional Data.";

export interface ChallengeResource {
  id: string;
  category: "NASA Data & Resources" | "Space Agency Partner Resources" | "Canadian Space Agency (CSA)";
  name: string;
  url: string;
  description: string;
  howUsed: string;
}

/**
 * Recursos Oficiais do Desafio NASA Space Apps integrados e referenciados no PHASE-ZERO.
 */
export const CHALLENGE_RESOURCES: readonly ChallengeResource[] = [
  {
    id: "csa-sar-tutorial",
    category: "Canadian Space Agency (CSA)",
    name: "Synthetic Aperture Radar Python Tutorial (ASC-CSA)",
    url: "https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial",
    description: "Tutorial demonstrando processamento de dados SAR em Python e QGIS para acesso e visualização.",
    howUsed:
      "Base metodológica do pipeline: cálculo de interferograma, remoção de fase topográfica, conversão fase-para-deslocamento (d = -lambda/(4*pi)*delta_phi) e filtragem por coerência espacial.",
  },
  {
    id: "statistical-tests-trends",
    category: "Space Agency Partner Resources",
    name: "Statistical test methods to detect trends in time series data",
    url: "https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b",
    description: "Guia sobre testes estatísticos de tendência (Mann-Kendall, regressão linear e estimador de Sen).",
    howUsed:
      "Implementado em backend/src/lib/statisticalTrend.ts: calcula a estatística S de Mann-Kendall e a inclinação de Sen para validar se a deformação do maciço é uma tendência física real ou ruído.",
  },
  {
    id: "statistical-significance-guide",
    category: "Space Agency Partner Resources",
    name: "A Comprehensive Guide to Statistical Significance (Statsig)",
    url: "https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance",
    description: "Guia completo sobre testes de hipóteses, p-valor e significância estatística.",
    howUsed:
      "Formulação do teste de hipótese (H0: estabilidade estrutural vs Ha: anomalia ativa) com p-valor bicaudal e limiar alfa = 0.05 (intervalo de confiança de 95%) integrado ao diagnóstico.",
  },
  {
    id: "nasa-seawifs-time-series",
    category: "NASA Data & Resources",
    name: "Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll (NASA NTRS)",
    url: "https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf",
    description: "Artigo científico da NASA demonstrando criação de séries temporais orbitais e testes de significância.",
    howUsed:
      "Referência para modelagem temporal de dados de observação da Terra por satélite e separação entre componentes sazonais/cíclicas e deriva estrutural acumulada.",
  },
  {
    id: "swot-mission",
    category: "Canadian Space Agency (CSA)",
    name: "SWOT Mission (Surface Water and Ocean Topography)",
    url: "https://www.asc-csa.gc.ca/eng/satellites/swot/",
    description: "Missão conjunta NASA/CNES/CSA/UKSA medindo elevação da superfície da água em lagos, reservatórios e rios.",
    howUsed:
      "Monitoramento por radar interferométrico KaRIn da cota da lâmina d'água dos reservatórios de barragens, dado primordial para a modelagem da sobrecarga de empuxo hidrostático.",
  },
  {
    id: "csa-rcm-data",
    category: "Canadian Space Agency (CSA)",
    name: "Radarsat Constellation Mission (RCM) - Data",
    url: "https://donnees-data.asc-csa.gc.ca/en/dataset/rcm",
    description: "Constelação canadense de 3 satélites SAR em Banda C para gestão de desastres e monitoramento de ecossistemas.",
    howUsed:
      "Compatibilidade de comprimento de onda (Banda C, lambda = 55.5 mm): o motor do PHASE-ZERO suporta granules SAR da constelação RCM para monitoramento contínuo em dias/noites e qualquer clima.",
  },
  {
    id: "nasa-giovanni",
    category: "NASA Data & Resources",
    name: "NASA Giovanni (GES DISC)",
    url: "https://giovanni.gsfc.nasa.gov/",
    description: "Ferramenta versátil para exploração, geração e download de séries temporais de variáveis terrestres e atmosféricas.",
    howUsed:
      "Fonte de dados e benchmark de séries temporais hidrometeorológicas e de temperatura da superfície para calibração dos efeitos ambientais sazonais.",
  },
  {
    id: "nasa-hydrology-time-series",
    category: "NASA Data & Resources",
    name: "Hydrology Time Series (NASA GES DISC)",
    url: "https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series",
    description: "Ferramenta da NASA para geração de séries temporais com dados hidrológicos (GLDAS / NLDAS).",
    howUsed:
      "Validação das variáveis de sobrecarga de umidade no solo, escoamento e precipitação que influenciam na poro-pressão interna dos taludes de barragens.",
  },
  {
    id: "nasa-appeears",
    category: "NASA Data & Resources",
    name: "AppEEARS (NASA Earthdata Cloud)",
    url: "https://appeears.earthdatacloud.nasa.gov/",
    description: "Acesso simples e eficiente para transformar dados geoespaciais e gerar séries temporais na nuvem Earthdata.",
    howUsed:
      "Arquitetura de streaming e amostragem de dados pontuais da Earthdata Cloud compatível com extrações analíticas prontas do AppEEARS.",
  },
  {
    id: "knmi-climate-explorer",
    category: "Space Agency Partner Resources",
    name: "KNMI Climate Explorer (Royal Netherlands Meteorological Institute)",
    url: "https://climexp.knmi.nl/",
    description: "Ferramenta científica web para pesquisadores analisarem e visualizarem dados e tendências climáticas.",
    howUsed:
      "Ferramenta analítica de referência para correlação entre séries históricas de temperatura/precipitação e regimes térmicos estruturais.",
  },
  {
    id: "noaa-cdo",
    category: "NASA Data & Resources",
    name: "Climate Data Online (CDO - NOAA NCEI)",
    url: "https://www.ncei.noaa.gov/cdo-web/",
    description: "Acesso a dados históricos de clima e estações meteorológicas globais com ferramenta de mapas.",
    howUsed:
      "Validação de solo e aferição cruzada entre dados de sensoriamento remoto orbital e histórico pluviométrico de estações de superfície.",
  },
  {
    id: "csa-geo-ca",
    category: "Canadian Space Agency (CSA)",
    name: "Geo.ca (Canadá)",
    url: "http://geo.ca/",
    description: "Fonte definitiva de informações geoespaciais abertas do Canadá.",
    howUsed:
      "Camadas de delimitação geoespacial e dados abertos para monitoramento de infraestruturas críticas e recursos hídricos.",
  },
  {
    id: "csa-monitoring-ecosystems",
    category: "Canadian Space Agency (CSA)",
    name: "Monitoring and protecting our ecosystem from space (ASC-CSA)",
    url: "https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp",
    description: "Orientações sobre como dados de satélite ajudam a monitorar mudanças e proteger ecossistemas e infraestruturas.",
    howUsed:
      "Enquadramento dos protocolos de alerta precoce e mitigação de desastres ambientais decorrentes de colapso de barragens de mineração e hidrelétricas.",
  },
] as const;

