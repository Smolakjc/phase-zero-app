import { config } from "../config.js";
import { AppError } from "./errors.js";

/** GET JSON com timeout. Converte falhas de rede/HTTP em `AppError` 502. */
export async function fetchJson(url, { timeoutMs = config.apiTimeoutMs, service = "API externa" } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new AppError(502, `${service} indisponível (${err.name === "TimeoutError" ? "timeout" : err.message}).`);
  }
  if (!response.ok) {
    throw new AppError(502, `${service} respondeu HTTP ${response.status}.`);
  }
  return response.json();
}
