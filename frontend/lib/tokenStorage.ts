/**
 * Persistência encapsulada do Bearer Token NASA Earthdata em `localStorage` (`R-F3`).
 *
 * Aviso de segurança (Seção 1.4):
 * O token é armazenado localmente no navegador (`localStorage`) apenas sob ação explícita
 * do usuário e enviado no body de `POST /api/analyze` para leitura autenticada de granules
 * `.h5` no Earthdata Cloud. O backend aplica redact no logger pino e jamais persiste ou loga o token.
 */

export const EARTHDATA_TOKEN_STORAGE_KEY = "nasa_earthdata_token";
export const MIN_TOKEN_LENGTH = 21; // > 20 caracteres, igual à regra do backend

export function isValidEarthdataToken(token: string): boolean {
  return token.trim().length >= MIN_TOKEN_LENGTH;
}

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(EARTHDATA_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      window.localStorage.removeItem(EARTHDATA_TOKEN_STORAGE_KEY);
    } else {
      window.localStorage.setItem(EARTHDATA_TOKEN_STORAGE_KEY, trimmed);
    }
  } catch {
    // Ignora erro de quota ou storage bloqueado
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EARTHDATA_TOKEN_STORAGE_KEY);
  } catch {
    // Ignora erro de storage bloqueado
  }
}

