/**
 * Cache LRU em memória com TTL e deduplicação de chamadas concorrentes (`R-B6`).
 *
 * Chaves seguem o padrão `serviço:lat:lon:start:end`.
 */

export interface LruCacheOptions {
  ttlMs: number;
  maxEntries?: number;
}

interface CacheEntry<T> {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
}

export class LruCache<T> {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(options: LruCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? 128;
  }

  public get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    if (entry.value === undefined) return undefined;
    // Atualiza ordem LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: T, customTtlMs?: number): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (customTtlMs ?? this.ttlMs),
    });
    this.evictIfNeeded();
  }

  public async getOrLoad(key: string, loader: () => Promise<T>, customTtlMs?: number): Promise<T> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (existing && existing.expiresAt > now) {
      this.store.delete(key);
      this.store.set(key, existing);
      if (existing.value !== undefined) {
        return existing.value;
      }
      if (existing.promise) {
        return existing.promise;
      }
    }

    const ttl = customTtlMs ?? this.ttlMs;
    const promise = loader()
      .then((val) => {
        this.store.set(key, {
          value: val,
          expiresAt: Date.now() + ttl,
        });
        this.evictIfNeeded();
        return val;
      })
      .catch((err) => {
        this.store.delete(key);
        throw err;
      });

    this.store.set(key, {
      promise,
      expiresAt: now + ttl,
    });
    this.evictIfNeeded();
    return promise;
  }

  public clear(): void {
    this.store.clear();
  }

  public get size(): number {
    return this.store.size;
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }
}

export const CACHE_TTLS = {
  POWER_MS: 6 * 60 * 60 * 1000, // 6 horas
  DEM_MS: 24 * 60 * 60 * 1000, // 24 horas
  CMR_MS: 1 * 60 * 60 * 1000, // 1 hora
} as const;

export function buildCacheKey(
  service: string,
  lat: number,
  lon: number,
  start = "",
  end = "",
): string {
  return `${service}:${lat.toFixed(5)}:${lon.toFixed(5)}:${start}:${end}`;
}

