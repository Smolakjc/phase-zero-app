/**
 * Configuração central do backend.
 *
 * Tudo que pode mudar entre ambientes vem de variáveis de ambiente;
 * constantes físicas e limiares de classificação ficam em `constants.js`.
 */

const toInt = (value, fallback) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  /** Porta HTTP (o frontend espera 8000 por padrão). */
  port: toInt(process.env.PORT, 8000),

  /** Origem permitida no CORS. Use "*" apenas em desenvolvimento. */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  /** Token Earthdata de fallback, usado quando a requisição não envia um. */
  earthdataToken: process.env.EARTHDATA_TOKEN ?? "",

  /** Quantidade máxima de granules NISAR baixados por análise (cada um é grande). */
  maxGranules: toInt(process.env.MAX_GRANULES, 6),

  /** Tamanho máximo aceito para o download de um granule, em MB. */
  maxGranuleMb: toInt(process.env.MAX_GRANULE_MB, 4096),

  /** Timeout das APIs públicas (POWER, CMR, elevação), em ms. */
  apiTimeoutMs: toInt(process.env.API_TIMEOUT_MS, 15_000),
};
