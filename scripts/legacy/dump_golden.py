#!/usr/bin/env python3
"""
Gera os fixtures golden a partir do motor legado v4.2 (Python / NumPy / SciPy / PyProj)
com serviços externos (NASA POWER, Open-Meteo DEM, NASA CMR) determinísticos/mockados.

Uso:
    python scripts/legacy/dump_golden.py
"""

import h5py
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from pyproj import Transformer
from scipy.interpolate import RegularGridInterpolator
from scipy.ndimage import zoom

LAMBDA_NISAR_L_MM = 238.4
LAMBDA_SENTINEL_C_MM = 55.5
OFFICIAL_DISCLAIMER = (
    "Satellite InSAR is a broad-area monitoring and triage layer, "
    "not a standalone structural safety system. Uses NISAR Provisional Data."
)

PRESET_EXAMPLES: Dict[str, Dict[str, Any]] = {
    "itaipu_normal": {
        "name": "Exemplo 1: Usina de Itaipu (Foz do Iguaçu, PR)",
        "sensor": "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
        "wavelength_mm": LAMBDA_NISAR_L_MM,
        "lat": -25.408,
        "lon": -54.588,
        "los_vector": {
            "losUnitVectorX": -0.62,
            "losUnitVectorY": -0.14,
            "incidenceAngle": 38.5,
            "elevationAngle": 51.5,
        },
        "anomaly_rate_mm_per_step": 0.0,
        "accel_factor": 0.0,
        "regime_info": "Regime Elástico Estável (🟢 Verde: Taxa < 0.35 mm/ciclo)",
        "default_start": "2026-03-01",
        "default_end": "2026-09-15",
    },
    "gongo_soco_active": {
        "name": "Exemplo 2: Talude Gongo Soco / Sul Superior (Barão de Cocais, MG)",
        "sensor": "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
        "wavelength_mm": LAMBDA_NISAR_L_MM,
        "lat": -19.963,
        "lon": -43.593,
        "los_vector": {
            "losUnitVectorX": -0.58,
            "losUnitVectorY": -0.12,
            "incidenceAngle": 36.2,
            "elevationAngle": 53.8,
        },
        "anomaly_rate_mm_per_step": -0.92,
        "accel_factor": -0.005,
        "regime_info": "Deformação Residual Lenta e Contínua sem Aceleração Crítica (🟡 Amarelo)",
        "default_start": "2026-03-01",
        "default_end": "2026-09-15",
    },
    "maceio_subsidence": {
        "name": "Exemplo 3: Subsidência Mutange/Pinheiro (Maceió, AL)",
        "sensor": "NISAR_L2_GUNW_PROVISIONAL_V1 (Banda L, λ=238.4mm)",
        "wavelength_mm": LAMBDA_NISAR_L_MM,
        "lat": -9.632,
        "lon": -35.748,
        "los_vector": {
            "losUnitVectorX": -0.60,
            "losUnitVectorY": -0.11,
            "incidenceAngle": 37.0,
            "elevationAngle": 53.0,
        },
        "anomaly_rate_mm_per_step": -1.55,
        "accel_factor": -0.065,
        "regime_info": "Afundamento Urbano em Aceleração Progressiva (🔴 Vermelho)",
        "default_start": "2026-03-01",
        "default_end": "2026-09-15",
    },
    "brumadinho_hist": {
        "name": "Exemplo 4: Histórico Barragem B1 (Brumadinho, MG - 2018/2019)",
        "sensor": "ARIA-S1-GUNW / OPERA DISP-S1 (Banda C, λ=55.5mm)",
        "wavelength_mm": LAMBDA_SENTINEL_C_MM,
        "lat": -20.119,
        "lon": -44.121,
        "los_vector": {
            "losUnitVectorX": 0.61,
            "losUnitVectorY": -0.13,
            "incidenceAngle": 37.8,
            "elevationAngle": 52.2,
        },
        "anomaly_rate_mm_per_step": -1.95,
        "accel_factor": -0.14,
        "regime_info": "Série Histórica Retro-Forense com Aceleração Precursora (🔴 Vermelho)",
        "default_start": "2018-07-01",
        "default_end": "2019-01-20",
    },
}


def build_synthetic_climate(start_date: str, end_date: str, n_steps: int = 16) -> Dict[str, Any]:
    try:
        d0 = datetime.strptime(start_date, "%Y-%m-%d")
        d1 = datetime.strptime(end_date, "%Y-%m-%d")
        if d1 <= d0:
            d1 = d0 + timedelta(days=180)
    except Exception:
        d0, d1 = datetime(2026, 3, 1), datetime(2026, 9, 15)
    delta = (d1 - d0) / max(1, n_steps - 1)
    dates = [(d0 + delta * i).strftime("%Y-%m-%d") for i in range(n_steps)]
    t_idx = np.arange(n_steps)
    return {
        "dates": dates,
        "ts": 25.0 + 5.5 * np.sin(t_idx * 0.6),
        "sw": 205.0 + 48.0 * np.sin(t_idx * 0.6),
        "precip": np.maximum(0.0, 38.0 * np.sin(t_idx * 0.5)),
        "rh": 65.0 + 14.0 * np.cos(t_idx * 0.7),
        "ps": np.full(n_steps, 96.0),
    }


def build_3d_terrain_grid(
    lat: float,
    lon: float,
    grid_size: int = 18,
    is_custom: bool = False,
    mock_elevations_25: Optional[List[float]] = None,
) -> np.ndarray:
    center = (grid_size - 1) / 2.0
    rr, cc = np.meshgrid(np.arange(grid_size), np.arange(grid_size), indexing="ij")

    crest_profile = 24.0 * np.exp(-((rr - 6.5) ** 2) / 5.0) * np.exp(-((cc - center) ** 2) / 38.0)
    slope_profile = (grid_size - rr) * 2.8 + np.sin(cc * 0.45) * 4.0
    synthetic_relief = crest_profile + slope_profile

    if not is_custom:
        base_alt = (
            195.0
            if abs(lat - (-25.408)) < 0.2
            else (18.0 if abs(lat - (-9.632)) < 0.2 else 820.0)
        )
        return base_alt + synthetic_relief

    if mock_elevations_25 is not None:
        elevs = np.array(mock_elevations_25, dtype=float)
        elevs = np.nan_to_num(elevs, nan=400.0).reshape((5, 5))
        dem_grid = zoom(elevs, grid_size / 5.0, order=2)[:grid_size, :grid_size]
        if float(np.max(dem_grid) - np.min(dem_grid)) < 6.0:
            return float(np.mean(dem_grid)) + synthetic_relief * 0.65
        return dem_grid

    return 500.0 + synthetic_relief


def run_pipeline_legacy(
    req: Dict[str, Any],
    power_data: Optional[Dict[str, Any]] = None,
    cmr_granules: Optional[List[Dict[str, str]]] = None,
    mock_elevations_25: Optional[List[float]] = None,
) -> Dict[str, Any]:
    np.random.seed(42)
    grid_size = 18
    scenario_id = req.get("scenario_id", "gongo_soco_active")
    apply_ionosphere = req.get("apply_ionosphere", True)
    apply_troposphere = req.get("apply_troposphere", True)
    apply_solid_tides = req.get("apply_solid_tides", True)
    apply_nasa_power = req.get("apply_nasa_power", True)
    min_coherence = req.get("min_coherence", 0.40)
    start_date = req.get("start_date", "2026-03-01")
    end_date = req.get("end_date", "2026-09-15")
    custom_lat = req.get("custom_lat")
    custom_lon = req.get("custom_lon")
    custom_name = req.get("custom_name")

    is_custom = scenario_id == "custom"

    if is_custom and custom_lat is not None and custom_lon is not None:
        lat = round(float(custom_lat), 5)
        lon = round(float(custom_lon), 5)
        target_name = f"Busca Live NASA: {custom_name or 'Coordenada Livre'} ({lat}, {lon})"
        los_vector = {
            "losUnitVectorX": -0.60,
            "losUnitVectorY": -0.13,
            "incidenceAngle": 37.5,
            "elevationAngle": 52.5,
        }
    else:
        preset = PRESET_EXAMPLES.get(scenario_id, PRESET_EXAMPLES["gongo_soco_active"])
        lat, lon = preset["lat"], preset["lon"]
        target_name = preset["name"]
        los_vector = preset["los_vector"]

    if power_data is not None:
        dates = power_data["dates"]
        ts_celsius = np.array(power_data["ts"], dtype=float)
        sw_irradiance = np.array(power_data["sw"], dtype=float)
        precip_mm = np.array(power_data["precip"], dtype=float)
        rh_pct = np.array(power_data["rh"], dtype=float)
        ps_kpa = np.array(power_data["ps"], dtype=float)
        power_real_ok = True
    else:
        synth = build_synthetic_climate(start_date, end_date, n_steps=16)
        dates = synth["dates"]
        ts_celsius = synth["ts"]
        sw_irradiance = synth["sw"]
        precip_mm = synth["precip"]
        rh_pct = synth["rh"]
        ps_kpa = synth["ps"]
        power_real_ok = False

    n_steps = len(dates)
    t_idx = np.arange(n_steps)

    d_expected_mm = (
        0.85 * (ts_celsius - np.mean(ts_celsius))
        + 0.03 * (sw_irradiance - np.mean(sw_irradiance))
        + 0.06 * (precip_mm - np.mean(precip_mm))
    )
    wet_tropo_mm = 0.22 * (rh_pct - np.mean(rh_pct))
    hydro_tropo_mm = 1.8 * (ps_kpa - np.mean(ps_kpa))
    solid_tides_mm = 2.8 * np.cos(t_idx * 1.7)

    elev_grid = build_3d_terrain_grid(
        lat, lon, grid_size, is_custom=is_custom, mock_elevations_25=mock_elevations_25
    )
    granules = cmr_granules if cmr_granules is not None else []
    h5_streamed_ok = False

    if is_custom:
        wl = LAMBDA_NISAR_L_MM if start_date >= "2026-06-01" else LAMBDA_SENTINEL_C_MM
        sensor_label = f"NASA CMR ({len(granules)} granules) + Live NASA POWER"
        regime_label = (
            f"Granule encontrado: {granules[-1]['title'][:38]}"
            if granules
            else "Clima NASA POWER + Topografia DEM 30m Reais"
        )
        iono_mm = (8.5 if wl > 100 else 1.4) * np.sin(t_idx * 0.9)
    else:
        preset = PRESET_EXAMPLES.get(scenario_id, PRESET_EXAMPLES["gongo_soco_active"])
        wl = preset["wavelength_mm"]
        sensor_label = preset["sensor"]
        regime_label = preset["regime_info"]
        iono_mm = (9.2 if wl > 100 else 1.3) * np.sin(t_idx * 0.9 + 0.4)

    phase_to_mm = -wl / (4.0 * np.pi)
    processed_pixels = []
    center = (grid_size - 1) / 2.0

    for row in range(grid_size):
        for col in range(grid_size):
            lat_px = lat + (row - center) * 0.00072
            lon_px = lon + (col - center) * 0.00072
            elev_px = float(elev_grid[row, col])

            if is_custom:
                coherence = float(np.clip(0.84 - 0.012 * abs(elev_px - np.mean(elev_grid)), 0.25, 0.95))
                true_anom_series = np.zeros(n_steps)
                zone_type = f"TERRENO REAL (Alt: {round(elev_px)}m)"
            else:
                preset = PRESET_EXAMPLES.get(scenario_id, PRESET_EXAMPLES["gongo_soco_active"])
                if row < 5:
                    zone_type = "ÁGUA DA REPRESA (Reservatório)"
                    coherence = 0.19
                    sw_w = 0.0
                elif 5 <= row <= 7 and 2 <= col <= 15:
                    zone_type = "MURETA / CRISTA PRINCIPAL (Topo)"
                    coherence = 0.94
                    sw_w = 0.20
                elif 8 <= row <= 13 and 3 <= col <= 14:
                    zone_type = "PAREDÃO / TALUDE CENTRAL"
                    coherence = 0.90
                    sw_w = float(np.exp(-((row - 10.0) ** 2 + (col - center) ** 2) / 10.0))
                else:
                    zone_type = "VEGETAÇÃO DENSA / ENTORNO"
                    coherence = 0.28
                    sw_w = 0.04

                rate = preset["anomaly_rate_mm_per_step"]
                acc = preset["accel_factor"]
                base_anom = np.where(t_idx > 3, rate * (t_idx - 3) + acc * ((t_idx - 3) ** 2), 0.0)
                true_anom_series = base_anom * sw_w

            px_raw_ts, px_comp_ts, px_res_ts, px_loop = [], [], [], []
            for i in range(n_steps):
                raw_i = (
                    true_anom_series[i]
                    + d_expected_mm[i]
                    + iono_mm[i]
                    + wet_tropo_mm[i]
                    + hydro_tropo_mm[i]
                    + solid_tides_mm[i]
                )
                val_i = raw_i
                if apply_ionosphere:
                    val_i -= iono_mm[i]
                if apply_troposphere:
                    val_i -= wet_tropo_mm[i] + hydro_tropo_mm[i]
                if apply_solid_tides:
                    val_i -= solid_tides_mm[i]

                exp_i = d_expected_mm[i] if apply_nasa_power else 0.0
                res_i = val_i - exp_i

                px_raw_ts.append(round(float(raw_i), 2))
                px_comp_ts.append(round(float(val_i), 2))
                px_res_ts.append(round(float(res_i), 2))
                px_loop.append(
                    {
                        "date": dates[i],
                        "surface_temp_c": round(float(ts_celsius[i]), 2),
                        "displacement_mm": round(float(val_i), 2),
                        "residual_mm": round(float(res_i), 2),
                    }
                )

            is_masked = coherence < min_coherence
            coherence_weight = 0.0 if is_masked else coherence
            weighted_anomaly = abs(px_res_ts[-1]) * coherence_weight

            processed_pixels.append(
                {
                    "id": f"px_{row}_{col}",
                    "row": row,
                    "col": col,
                    "zone": zone_type,
                    "lat": round(lat_px, 6),
                    "lon": round(lon_px, 6),
                    "elevation_m": round(elev_px, 1),
                    "coherence": round(coherence, 3),
                    "compensated_los_mm": px_comp_ts[-1],
                    "residual_mm": px_res_ts[-1],
                    "masked": is_masked,
                    "anomaly_score": round(float(weighted_anomaly), 2),
                    "iono_uncertainty_mm": round(float(abs(phase_to_mm) * 0.15), 2),
                    "pixel_time_series": {
                        "observed_raw_mm": px_raw_ts,
                        "observed_compensated_mm": px_comp_ts,
                        "expected_environmental_mm": [round(float(x), 2) for x in d_expected_mm],
                        "residual_anomaly_mm": px_res_ts,
                        "thermo_loop": px_loop,
                    },
                }
            )

    ref_px = next((p for p in processed_pixels if p["row"] == 10 and p["col"] == 9), processed_pixels[0])
    residual_series = ref_px["pixel_time_series"]["residual_anomaly_mm"]

    slope = (residual_series[-1] - residual_series[0]) / max(1, n_steps - 1)
    accel = residual_series[-1] - 2.0 * residual_series[n_steps // 2] + residual_series[0]
    max_anomaly_score = max([p["anomaly_score"] for p in processed_pixels] or [0.0])

    if abs(slope) < 0.35 and max_anomaly_score < 5.0:
        status_code = "GREEN"
        status_label = "EXPECTED ENVIRONMENTAL MOTION"
        status_desc = (
            "Velocidade residual próxima de zero (< 0.35 mm/ciclo) e Score < 5.0. "
            "Movimento 100% explicado pelo clima."
        )
    elif abs(slope) < 1.45 and abs(accel) < 4.5 and max_anomaly_score < 20.0:
        status_code = "YELLOW"
        status_label = "PERSISTENT RESIDUAL ANOMALY"
        status_desc = (
            "Taxa residual constante (entre 0.35 e 1.45 mm/ciclo) sem aceleração brusca "
            "(Score entre 5.0 e 19.9). Requer monitoramento."
        )
    else:
        status_code = "RED"
        status_label = "ESCALATING SURFACE ANOMALY"
        status_desc = (
            "Velocidade severa (>= 1.45 mm/ciclo), aceleração forte (|Acel| >= 4.5 mm) "
            "ou Score >= 20.0 em blocos de alta coerência."
        )

    return {
        "scenario_meta": {
            "name": target_name,
            "sensor": sensor_label,
            "lat": lat,
            "lon": lon,
            "los_vector": los_vector,
            "regime_info": regime_label,
            "power_real_ok": power_real_ok,
            "cmr_granules_count": len(granules),
            "h5_streamed_ok": h5_streamed_ok,
            "asf_status": {
                "latest_granule": f"{len(granules)} Granules NASA CMR | 3 Métricas Calibradas"
            },
        },
        "status": {
            "code": status_code,
            "label": status_label,
            "description": status_desc,
            "residual_trend_mm_per_pass": round(float(slope), 2),
            "acceleration_index_mm": round(float(accel), 2),
            "max_weighted_anomaly_score": round(float(max_anomaly_score), 2),
        },
        "dates": dates,
        "grid_pixels": processed_pixels,
        "disclaimer": OFFICIAL_DISCLAIMER,
    }


def generate_interp_and_geo_reference() -> Dict[str, Any]:
    # 1. Zoom 5x5 -> 18x18 reference
    elevs_25 = [
        710.0 + 18.0 * float(np.sin(i * 0.7)) + 9.0 * float(np.cos(i * 1.3))
        for i in range(25)
    ]
    arr_5x5 = np.array(elevs_25, dtype=float).reshape((5, 5))
    zoomed_18x18 = zoom(arr_5x5, 18 / 5.0, order=2)[:18, :18]

    # 2. RegularGridInterpolator reference
    ry = np.array([7500000.0, 7501000.0, 7502000.0])
    rx = np.array([600000.0, 601000.0, 602000.0, 603000.0])
    grid_vals = np.array(
        [
            [1.0, 2.0, 3.0, 4.0],
            [5.0, 6.0, 7.0, 8.0],
            [9.0, 10.0, 11.0, 12.0],
        ]
    )
    query_pts = np.array(
        [
            [7500500.0, 600500.0],
            [7501250.0, 602250.0],
            [7499000.0, 600500.0],  # out of bounds -> fill 0.0
            [7501000.0, 601000.0],  # exact node
        ]
    )
    rgi = RegularGridInterpolator((ry, rx), grid_vals, bounds_error=False, fill_value=0.0)
    interp_out = rgi(query_pts).tolist()

    # 3. PyProj UTM reference
    geo_cases = [
        {"lat": -25.408, "lon": -54.588, "epsg": 32721},
        {"lat": -19.963, "lon": -43.593, "epsg": 32723},
        {"lat": -9.632, "lon": -35.748, "epsg": 32725},
        {"lat": 37.7749, "lon": -122.4194, "epsg": 32610},
    ]
    for case in geo_cases:
        tr = Transformer.from_crs("EPSG:4326", f"EPSG:{case['epsg']}", always_xy=True)
        x, y = tr.transform(case["lon"], case["lat"])
        case["x"] = float(x)
        case["y"] = float(y)

    return {
        "elevs_25": elevs_25,
        "zoomed_18x18": zoomed_18x18.tolist(),
        "bilinear": {
            "ry": ry.tolist(),
            "rx": rx.tolist(),
            "values": grid_vals.tolist(),
            "points": query_pts.tolist(),
            "expected": interp_out,
        },
        "geo_cases": geo_cases,
    }


def generate_h5_fixtures(fixtures_dir: Path) -> None:
    # Target point: Gongo Soco (-19.963, -43.593) in EPSG:32723
    lat, lon, epsg = -19.963, -43.593, 32723
    tr = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
    tx, ty = tr.transform(lon, lat)

    nx, ny = 24, 24
    x_coords = np.linspace(tx - 1200.0, tx + 1200.0, nx)
    y_coords = np.linspace(ty - 1200.0, ty + 1200.0, ny)

    rr, cc = np.meshgrid(np.arange(ny), np.arange(nx), indexing="ij")
    unw_phase = (0.15 * np.sin(rr * 0.3) + 0.1 * np.cos(cc * 0.25)).astype(np.float32)
    unw_phase[0, 0] = np.nan
    coherence = np.clip(0.82 - 0.01 * np.abs(rr - 12), 0.1, 0.98).astype(np.float32)
    coherence[0, 1] = np.nan
    conn_comp = np.ones((ny, nx), dtype=np.int32)
    iono_screen = (0.04 * np.sin(rr * 0.2)).astype(np.float32)
    iono_uncert = np.full((ny, nx), 0.01, dtype=np.float32)

    rx = np.linspace(tx - 1500.0, tx + 1500.0, 6)
    ry = np.linspace(ty - 1500.0, ty + 1500.0, 6)
    r_rr, r_cc = np.meshgrid(np.arange(6), np.arange(6), indexing="ij")
    wet_tropo = (0.02 * r_rr + 0.01 * r_cc)[np.newaxis, :, :].astype(np.float32)
    hydro_tropo = (0.05 + 0.005 * r_rr)[np.newaxis, :, :].astype(np.float32)
    solid_tides = (0.03 * np.cos(r_cc * 0.4))[np.newaxis, :, :].astype(np.float32)
    los_x = np.full((1, 6, 6), -0.58, dtype=np.float32)
    los_y = np.full((1, 6, 6), -0.12, dtype=np.float32)
    inc_angle = np.full((1, 6, 6), 36.2, dtype=np.float32)
    elev_angle = np.full((1, 6, 6), 53.8, dtype=np.float32)

    nisar_path = fixtures_dir / "sample_nisar_gunw.h5"
    with h5py.File(nisar_path, "w") as f:
        g_base = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram"
        hh_base = f"{g_base}/HH"
        meta_grid = "/science/LSAR/GUNW/metadata/radarGrid"

        f.create_dataset(f"{g_base}/xCoordinates", data=x_coords)
        f.create_dataset(f"{g_base}/yCoordinates", data=y_coords)
        f.create_dataset(f"{g_base}/projection", data=np.int32(epsg))
        f.create_dataset(f"{hh_base}/unwrappedPhase", data=unw_phase)
        f.create_dataset(f"{hh_base}/coherenceMagnitude", data=coherence)
        f.create_dataset(f"{hh_base}/connectedComponents", data=conn_comp)
        f.create_dataset(f"{hh_base}/ionospherePhaseScreen", data=iono_screen)
        f.create_dataset(f"{hh_base}/ionospherePhaseScreenUncertainty", data=iono_uncert)

        f.create_dataset(f"{meta_grid}/xCoordinates", data=rx)
        f.create_dataset(f"{meta_grid}/yCoordinates", data=ry)
        f.create_dataset(f"{meta_grid}/wetTroposphericPhaseScreen", data=wet_tropo)
        f.create_dataset(f"{meta_grid}/hydrostaticTroposphericPhaseScreen", data=hydro_tropo)
        f.create_dataset(f"{meta_grid}/solidEarthTidesPhase", data=solid_tides)
        f.create_dataset(f"{meta_grid}/losUnitVectorX", data=los_x)
        f.create_dataset(f"{meta_grid}/losUnitVectorY", data=los_y)
        f.create_dataset(f"{meta_grid}/incidenceAngle", data=inc_angle)
        f.create_dataset(f"{meta_grid}/elevationAngle", data=elev_angle)

    # Expected slice for NISAR GUNW (18x18 around lat, lon)
    grid_size = 18
    half = grid_size // 2
    col_idx = int(np.argmin(np.abs(x_coords - tx)))
    row_idx = int(np.argmin(np.abs(y_coords - ty)))
    r0 = max(0, min(len(y_coords) - grid_size, row_idx - half))
    c0 = max(0, min(len(x_coords) - grid_size, col_idx - half))
    conv = -LAMBDA_NISAR_L_MM / (4.0 * np.pi)
    phase_slice = unw_phase[r0 : r0 + grid_size, c0 : c0 + grid_size]
    coh_slice = coherence[r0 : r0 + grid_size, c0 : c0 + grid_size]
    nisar_slice_expected = {
        "raw_mm_grid": (np.nan_to_num(phase_slice, nan=0.0) * conv).tolist(),
        "coherence_grid": np.clip(np.nan_to_num(coh_slice, nan=0.5), 0.05, 0.99).tolist(),
        "wavelength_mm": LAMBDA_NISAR_L_MM,
    }
    with open(fixtures_dir / "golden" / "sample_nisar_gunw_slice.json", "w", encoding="utf-8") as f:
        json.dump(nisar_slice_expected, f, indent=2)

    # Expected extract-h5 output for NISAR GUNW
    yy, xx = np.meshgrid(y_coords, x_coords, indexing="ij")
    pts = np.array([yy.ravel(), xx.ravel()]).T
    interp_wet = RegularGridInterpolator((ry, rx), wet_tropo[0], bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)
    interp_hydro = RegularGridInterpolator((ry, rx), hydro_tropo[0], bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)
    interp_tides = RegularGridInterpolator((ry, rx), solid_tides[0], bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)
    extracted_expected = {
        "los_vector": {
            "losUnitVectorX": round(float(np.nanmean(los_x[0])), 4),
            "losUnitVectorY": round(float(np.nanmean(los_y[0])), 4),
            "incidenceAngle": round(float(np.nanmean(inc_angle[0])), 2),
            "elevationAngle": round(float(np.nanmean(elev_angle[0])), 2),
        },
        "raw_los_mm": (np.nan_to_num(unw_phase, nan=0.0) * conv).tolist(),
        "iono_mm": (np.nan_to_num(iono_screen, nan=0.0) * conv).tolist(),
        "tropo_mm": ((interp_wet + interp_hydro) * conv).tolist(),
        "tides_mm": (interp_tides * conv).tolist(),
        "coherence": np.nan_to_num(coherence, nan=0.0).tolist(),
        "connected_components": conn_comp.tolist(),
        "iono_uncertainty_rad": iono_uncert.tolist(),
    }
    with open(fixtures_dir / "golden" / "sample_nisar_gunw_extracted.json", "w", encoding="utf-8") as f:
        json.dump(extracted_expected, f, indent=2)

    # OPERA DISP fixture
    opera_path = fixtures_dir / "sample_opera_disp.h5"
    disp_m = (unw_phase * -0.002).astype(np.float32)
    with h5py.File(opera_path, "w") as f:
        f.create_dataset("x", data=x_coords)
        f.create_dataset("y", data=y_coords)
        sp = f.create_dataset("spatial_ref", data=np.int32(0))
        sp.attrs["epsg_code"] = np.int32(epsg)
        f.create_dataset("displacement", data=disp_m)
        f.create_dataset("temporal_coherence", data=coherence)

    disp_slice = disp_m[r0 : r0 + grid_size, c0 : c0 + grid_size]
    opera_slice_expected = {
        "raw_mm_grid": (np.nan_to_num(disp_slice, nan=0.0) * 1000.0).tolist(),
        "coherence_grid": np.clip(np.nan_to_num(coh_slice, nan=0.5), 0.05, 0.99).tolist(),
        "wavelength_mm": LAMBDA_SENTINEL_C_MM,
    }
    with open(fixtures_dir / "golden" / "sample_opera_disp_slice.json", "w", encoding="utf-8") as f:
        json.dump(opera_slice_expected, f, indent=2)


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    fixtures_dir = root / "backend" / "src" / "__tests__" / "fixtures"
    out_dir = fixtures_dir / "golden"
    out_dir.mkdir(parents=True, exist_ok=True)
    generate_h5_fixtures(fixtures_dir)

    toggle_combos = [
        ("all_on", {"apply_ionosphere": True, "apply_troposphere": True, "apply_solid_tides": True, "apply_nasa_power": True, "min_coherence": 0.40}),
        ("all_off", {"apply_ionosphere": False, "apply_troposphere": False, "apply_solid_tides": False, "apply_nasa_power": False, "min_coherence": 0.40}),
        ("no_iono", {"apply_ionosphere": False, "apply_troposphere": True, "apply_solid_tides": True, "apply_nasa_power": True, "min_coherence": 0.40}),
        ("no_tropo", {"apply_ionosphere": True, "apply_troposphere": False, "apply_solid_tides": True, "apply_nasa_power": True, "min_coherence": 0.40}),
        ("no_tides", {"apply_ionosphere": True, "apply_troposphere": True, "apply_solid_tides": False, "apply_nasa_power": True, "min_coherence": 0.40}),
        ("no_power", {"apply_ionosphere": True, "apply_troposphere": True, "apply_solid_tides": True, "apply_nasa_power": False, "min_coherence": 0.40}),
        ("coh_075", {"apply_ionosphere": True, "apply_troposphere": True, "apply_solid_tides": True, "apply_nasa_power": True, "min_coherence": 0.75}),
    ]

    for scenario_id, preset in PRESET_EXAMPLES.items():
        for combo_name, toggles in toggle_combos:
            req = {
                "scenario_id": scenario_id,
                "start_date": preset["default_start"],
                "end_date": preset["default_end"],
                **toggles,
            }
            resp = run_pipeline_legacy(req)
            fname = f"{scenario_id}__{combo_name}.json"
            with open(out_dir / fname, "w", encoding="utf-8") as f:
                json.dump({"request": req, "response": resp}, f, ensure_ascii=False, indent=2)

    # Custom scenario fixture with mocked DEM & CMR
    ref_data = generate_interp_and_geo_reference()
    custom_req = {
        "scenario_id": "custom",
        "apply_ionosphere": True,
        "apply_troposphere": True,
        "apply_solid_tides": True,
        "apply_nasa_power": True,
        "min_coherence": 0.40,
        "start_date": "2026-06-15",
        "end_date": "2026-09-15",
        "custom_lat": -22.9068,
        "custom_lon": -43.1729,
        "custom_name": "Rio de Janeiro",
    }
    custom_resp = run_pipeline_legacy(
        custom_req,
        cmr_granules=[{"title": "NISAR_L2_GUNW_20260901_RJ_V1", "h5_url": "https://example.nasa.gov/g1.h5"}],
        mock_elevations_25=ref_data["elevs_25"],
    )
    with open(out_dir / "custom__mock_dem.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "request": custom_req,
                "mock_elevations_25": ref_data["elevs_25"],
                "mock_granules": [{"title": "NISAR_L2_GUNW_20260901_RJ_V1", "h5_url": "https://example.nasa.gov/g1.h5"}],
                "response": custom_resp,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    with open(out_dir / "math_interp_geo_ref.json", "w", encoding="utf-8") as f:
        json.dump(ref_data, f, ensure_ascii=False, indent=2)

    print(f"Gerados {len(list(out_dir.glob('*.json')))} arquivos golden em {out_dir}")


if __name__ == "__main__":
    main()
