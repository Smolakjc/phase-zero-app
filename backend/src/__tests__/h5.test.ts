import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convertNisarH5ToCache, ExtractedH5Payload } from "../scripts/extract-h5.js";
import { streamH5Slice } from "../services/h5Stream.js";
import { syntheticClimate } from "../services/nasaPower.js";
import { runPhaseZeroPipeline } from "../services/pipeline.js";
import { getTerrainGrid } from "../services/terrain.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");
const nisarH5Path = path.join(fixturesDir, "sample_nisar_gunw.h5");
const operaH5Path = path.join(fixturesDir, "sample_opera_disp.h5");

const expectedNisarSlice = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "golden", "sample_nisar_gunw_slice.json"), "utf-8"),
) as { raw_mm_grid: number[][]; coherence_grid: number[][]; wavelength_mm: number };

const expectedOperaSlice = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "golden", "sample_opera_disp_slice.json"), "utf-8"),
) as { raw_mm_grid: number[][]; coherence_grid: number[][]; wavelength_mm: number };

const expectedExtracted = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "golden", "sample_nisar_gunw_extracted.json"), "utf-8"),
) as ExtractedH5Payload;

describe("HDF5 Stream e CLI Extractor (K-B3, K-B4, K-B5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streamH5Slice extrai janela 18x18 de NISAR L2 GUNW idêntica ao Python", async () => {
    const res = await streamH5Slice(nisarH5Path, "dummy_token_over_20_chars_12345", -19.963, -43.593, 18);
    expect(res.wavelengthMm).toBe(expectedNisarSlice.wavelength_mm);
    expect(res.rawMmGrid.length).toBe(18);
    expect(res.coherenceGrid.length).toBe(18);

    for (let r = 0; r < 18; r += 1) {
      for (let c = 0; c < 18; c += 1) {
        expect(res.rawMmGrid[r][c]).toBeCloseTo(expectedNisarSlice.raw_mm_grid[r][c], 4);
        expect(res.coherenceGrid[r][c]).toBeCloseTo(expectedNisarSlice.coherence_grid[r][c], 4);
      }
    }
  });

  it("streamH5Slice extrai janela 18x18 de OPERA L3 DISP-S1 idêntica ao Python", async () => {
    const res = await streamH5Slice(operaH5Path, "dummy_token_over_20_chars_12345", -19.963, -43.593, 18);
    expect(res.wavelengthMm).toBe(expectedOperaSlice.wavelength_mm);
    for (let r = 0; r < 18; r += 1) {
      for (let c = 0; c < 18; c += 1) {
        expect(res.rawMmGrid[r][c]).toBeCloseTo(expectedOperaSlice.raw_mm_grid[r][c], 4);
        expect(res.coherenceGrid[r][c]).toBeCloseTo(expectedOperaSlice.coherence_grid[r][c], 4);
      }
    }
  });

  it("convertNisarH5ToCache (CLI K-B4) reproduz a saída de hdf5_extractor.py", async () => {
    const payload = await convertNisarH5ToCache(nisarH5Path);
    expect(payload.los_vector).toEqual(expectedExtracted.los_vector);
    expect(payload.raw_los_mm.length).toBe(expectedExtracted.raw_los_mm.length);

    for (let r = 0; r < payload.raw_los_mm.length; r += 1) {
      for (let c = 0; c < payload.raw_los_mm[0].length; c += 1) {
        expect(payload.raw_los_mm[r][c]).toBeCloseTo(expectedExtracted.raw_los_mm[r][c], 4);
        expect(payload.tropo_mm[r][c]).toBeCloseTo(expectedExtracted.tropo_mm[r][c], 4);
        expect(payload.tides_mm[r][c]).toBeCloseTo(expectedExtracted.tides_mm[r][c], 4);
      }
    }
  });

  it("integra o stream HDF5 no pipeline (ramo h5_streamed_ok = true, K-B5)", async () => {
    const resp = await runPhaseZeroPipeline(
      {
        scenario_id: "custom",
        custom_lat: -19.963,
        custom_lon: -43.593,
        custom_name: "Gongo Soco HDF5 Live",
        earthdata_token: "token_super_secreto_com_mais_de_20_caracteres",
        start_date: "2026-03-01",
        end_date: "2026-09-15",
      },
      {
        power: async (lat, lon, s, e, n) => ({
          climate: syntheticClimate(s, e, n),
          isReal: false,
        }),
        terrain: async (lat, lon, size) => getTerrainGrid(lat, lon, size, false),
        cmr: async () => [{ title: "NISAR_L2_GUNW_LIVE_TEST_GRANULE", h5_url: nisarH5Path }],
        h5: streamH5Slice,
      },
    );

    expect(resp.scenario_meta.h5_streamed_ok).toBe(true);
    expect(resp.scenario_meta.sensor).toContain("LIVE HDF5 STREAM:");
    expect(resp.grid_pixels[0].zone).toBe("PIXEL REAL HDF5 (0,0)");
  });

  it("nunca expõe o earthdata_token em mensagens de erro de download HDF5", async () => {
    const secretToken = "SECRET_EARTHDATA_BEARER_TOKEN_999888777";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
      }),
    );

    await expect(
      streamH5Slice("https://datapool.asf.alaska.edu/granule.h5", secretToken, -20, -44, 18),
    ).rejects.toSatisfy((err: unknown) => {
      const msg = err instanceof Error ? `${err.message} ${err.stack ?? ""}` : String(err);
      return !msg.includes(secretToken);
    });
  });
});

