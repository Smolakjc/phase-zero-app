import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LruCache } from "../lib/cache.js";
import { fetchJson, HttpError } from "../lib/http.js";
import { clearCmrCache, searchGranules } from "../services/cmr.js";
import {
  clearNasaPowerCache,
  fetchLiveNasaPower,
  getClimate,
  syntheticClimate,
} from "../services/nasaPower.js";
import { clearTerrainCache, getTerrainGrid } from "../services/terrain.js";

describe("Serviços externos e infraestrutura HTTP/Cache (R-B1..R-B7)", () => {
  beforeEach(() => {
    clearNasaPowerCache();
    clearTerrainCache();
    clearCmrCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("LruCache faz eviction do item mais antigo e deduplica promises concorrentes", async () => {
    const cache = new LruCache<number>({ ttlMs: 5000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1); // "a" agora é mais recente que "b"
    cache.set("c", 3); // deve remover "b"
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);

    let calls = 0;
    const loader = async (): Promise<number> => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return 42;
    };
    const [r1, r2] = await Promise.all([
      cache.getOrLoad("concurrent", loader),
      cache.getOrLoad("concurrent", loader),
    ]);
    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(calls).toBe(1);
  });

  it("fetchJson faz retry em erro 500 e falha em erro 404 sem retry extra", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ hello: "world" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchJson<{ hello: string }>("https://example.com/api", {
      retries: 1,
      retryDelayMs: 5,
    });
    expect(res.hello).toBe("world");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchJson("https://example.com/not-found", { retries: 2, retryDelayMs: 5 }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetchLiveNasaPower filtra -999, aplica defaults e rejeita se < 4 dias válidos", async () => {
    const ts: Record<string, number> = {
      "20260301": 24.5,
      "20260302": -999,
      "20260303": 25.0,
      "20260304": 26.0,
      "20260305": 27.0,
      "20260306": 28.0,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        properties: {
          parameter: {
            TS: ts,
            ALLSKY_SFC_SW_DWN: { "20260301": -999, "20260303": 210 },
            PRECTOTCORR: { "20260301": -999 },
            RH2M: { "20260301": -999 },
            PS: { "20260301": -999 },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const climate = await fetchLiveNasaPower(-20, -44, "2026-03-01", "2026-03-06", 4);
    expect(climate.dates.length).toBe(4);
    expect(climate.dates).not.toContain("2026-03-02");
    expect(climate.sw[0]).toBe(200.0);
    expect(climate.precip[0]).toBe(0.0);
    expect(climate.rh[0]).toBe(65.0);
    expect(climate.ps[0]).toBe(95.0);

    // Menos de 4 dias válidos -> erro
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        properties: {
          parameter: {
            TS: { "20260301": 24, "20260302": -999, "20260303": 25 },
          },
        },
      }),
    });
    await expect(
      fetchLiveNasaPower(-20, -44, "2026-03-01", "2026-03-03", 4),
    ).rejects.toThrow(/consolidados/);
  });

  it("getClimate faz fallback para syntheticClimate quando a API falha e corrige datas invertidas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const res = await getClimate(-20, -44, "2026-09-15", "2026-03-01", 16);
    expect(res.isReal).toBe(false);
    expect(res.climate.dates.length).toBe(16);
    expect(res.climate.dates[0]).toBe("2026-09-15");

    const invalidDates = syntheticClimate("invalid", "date", 16);
    expect(invalidDates.dates[0]).toBe("2026-03-01");
  });

  it("getTerrainGrid trata terreno plano (< 6m) e faz fallback 500 + relevo em erro", async () => {
    // 25 pontos todos iguais a 300m -> variação 0 < 6m -> mistura relevo sintético * 0.65
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ elevation: new Array(25).fill(300.0) }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const flatTerrain = await getTerrainGrid(-15.0, -47.0, 18, true);
    expect(flatTerrain.length).toBe(18);
    expect(flatTerrain[0][0]).toBeGreaterThan(300.0);

    clearTerrainCache();
    fetchMock.mockRejectedValue(new Error("timeout"));
    const fallbackTerrain = await getTerrainGrid(-15.0, -47.0, 18, true);
    expect(fallbackTerrain[0][0]).toBeGreaterThan(500.0);
  });

  it("searchGranules filtra links https .h5/.nc ignorando OPeNDAP e retorna [] em erro", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        feed: {
          entry: [
            {
              title: "GRANULE_1",
              links: [
                { href: "https://opendap.earthdata.nasa.gov/g1.h5", rel: "http://.../opendap" },
                { href: "https://datapool.asf.alaska.edu/g1.h5", rel: "http://.../data#" },
              ],
            },
            {
              title: "GRANULE_NO_H5",
              links: [{ href: "http://insecure.example.com/g2.h5" }],
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const granules = await searchGranules(-20, -44, "2026-03-01", "2026-09-15");
    expect(granules).toEqual([
      { title: "GRANULE_1", h5_url: "https://datapool.asf.alaska.edu/g1.h5" },
    ]);

    clearCmrCache();
    fetchMock.mockRejectedValue(new Error("cmr down"));
    const empty = await searchGranules(-20, -44, "2026-03-01", "2026-09-15");
    expect(empty).toEqual([]);
  });
});

