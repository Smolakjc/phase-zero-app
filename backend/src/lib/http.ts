/**
 * Cliente HTTP tipado com timeout via `AbortSignal.timeout` e retry com backoff (`R-B1`).
 */

export class HttpError extends Error {
  public readonly status: number;
  public readonly url: string;

  constructor(status: number, url: string, message?: string) {
    super(message ?? `HTTP Error ${status} when fetching ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  public readonly timeoutMs: number;
  public readonly url: string;

  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    this.url = url;
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

function isTimeoutAbort(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "TimeoutError" || err.name === "AbortError";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 8000, retries = 1, retryDelayMs = 200, headers = {} } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const httpErr = new HttpError(response.status, url);
        if (response.status >= 500 && attempt < retries) {
          lastError = httpErr;
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }
        throw httpErr;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (isTimeoutAbort(err)) {
        const timeoutErr = new TimeoutError(url, timeoutMs);
        if (attempt < retries) {
          lastError = timeoutErr;
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }
        throw timeoutErr;
      }
      if (err instanceof HttpError) {
        throw err;
      }
      lastError = err;
      if (attempt < retries) {
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown HTTP error");
}

