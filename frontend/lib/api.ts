import {
  AnalysisRequestInput,
  AnalysisRequestSchema,
  AnalysisResponse,
  AnalysisResponseSchema,
  LAMBDA_NISAR_L_MM,
  LAMBDA_SENTINEL_C_MM,
  ScenarioItem,
  ScenariosResponseSchema,
} from "@phase-zero/shared";

import itaipuGolden from "../../backend/src/__tests__/fixtures/golden/itaipu_normal__all_on.json";
import gongoGolden from "../../backend/src/__tests__/fixtures/golden/gongo_soco_active__all_on.json";
import maceioGolden from "../../backend/src/__tests__/fixtures/golden/maceio_subsidence__all_on.json";
import brumadinhoGolden from "../../backend/src/__tests__/fixtures/golden/brumadinho_hist__all_on.json";

export class NetworkError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "NetworkError";
    this.status = status;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const FALLBACK_SCENARIOS: ScenarioItem[] = [
  {
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
    regime_info: "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  {
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
    regime_info: "Deformação Residual Lenta e Contínua sem Aceleração Crítica (🟡 Amarelo)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  {
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
    regime_info: "Afundamento Urbano em Aceleração Progressiva (🔴 Vermelho)",
    default_start: "2026-03-01",
    default_end: "2026-09-15",
  },
  {
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
    regime_info: "Série Histórica Retro-Forense com Aceleração Precursora (🔴 Vermelho)",
    default_start: "2018-07-01",
    default_end: "2019-01-20",
  },
];

const MOCK_FIXTURES: Record<string, AnalysisResponse> = {
  itaipu_normal: itaipuGolden.response as AnalysisResponse,
  gongo_soco_active: gongoGolden.response as AnalysisResponse,
  maceio_subsidence: maceioGolden.response as AnalysisResponse,
  brumadinho_hist: brumadinhoGolden.response as AnalysisResponse,
};

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function isMockModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "1";
}

let activeAnalyzeController: AbortController | null = null;

export function cancelActiveAnalyze(): void {
  if (activeAnalyzeController) {
    activeAnalyzeController.abort();
    activeAnalyzeController = null;
  }
}

/**
 * Cliente tipado para `POST /api/analyze` (`S-F1`).
 * Cancela automaticamente requisições anteriores em voo via `AbortController`,
 * valida request e response com Zod e suporta modo mock (`NEXT_PUBLIC_USE_MOCK=1`).
 */
export async function analyze(
  input: AnalysisRequestInput,
  externalSignal?: AbortSignal,
): Promise<AnalysisResponse> {
  const parsedReq = AnalysisRequestSchema.safeParse(input);
  if (!parsedReq.success) {
    throw new ValidationError(`Parâmetros de análise inválidos: ${parsedReq.error.message}`);
  }

  if (isMockModeEnabled()) {
    const baseMock =
      MOCK_FIXTURES[parsedReq.data.scenario_id] ?? MOCK_FIXTURES.gongo_soco_active;
    const minCoh = parsedReq.data.min_coherence;
    const adjusted: AnalysisResponse = {
      ...baseMock,
      grid_pixels: baseMock.grid_pixels.map((px) => ({
        ...px,
        masked: px.coherence < minCoh,
      })),
    };
    return AnalysisResponseSchema.parse(adjusted);
  }

  cancelActiveAnalyze();
  const controller = new AbortController();
  activeAnalyzeController = controller;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedReq.data),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    throw new NetworkError(
      "Não foi possível conectar ao servidor PHASE-ZERO (Fastify). Verifique se o backend está ativo.",
    );
  } finally {
    if (activeAnalyzeController === controller) {
      activeAnalyzeController = null;
    }
  }

  if (!response.ok) {
    let detail = `Erro HTTP ${response.status}`;
    try {
      const errBody = (await response.json()) as { message?: string };
      if (errBody?.message) detail = errBody.message;
    } catch {
      // ignora body não-JSON
    }
    throw new NetworkError(detail, response.status);
  }

  const rawJson: unknown = await response.json();
  const parsedResp = AnalysisResponseSchema.safeParse(rawJson);
  if (!parsedResp.success) {
    throw new ValidationError(`Resposta da API fora do contrato: ${parsedResp.error.message}`);
  }

  return parsedResp.data;
}

/**
 * Busca a lista de cenários em `GET /api/scenarios` com fallback estático se offline (`R-F1`).
 */
export async function getScenarios(signal?: AbortSignal): Promise<ScenarioItem[]> {
  if (isMockModeEnabled()) {
    return FALLBACK_SCENARIOS;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/scenarios`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      return FALLBACK_SCENARIOS;
    }
    const rawJson: unknown = await response.json();
    const parsed = ScenariosResponseSchema.safeParse(rawJson);
    return parsed.success ? parsed.data.scenarios : FALLBACK_SCENARIOS;
  } catch {
    return FALLBACK_SCENARIOS;
  }
}

