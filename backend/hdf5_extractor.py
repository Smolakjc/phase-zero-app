import h5py
import json
import numpy as np
from scipy.interpolate import RegularGridInterpolator

LAMBDA_NISAR_L_MM = 238.4
PHASE_TO_MM = -LAMBDA_NISAR_L_MM / (4.0 * np.pi)

def convert_nisar_h5_to_cache(h5_filepath: str, output_json: str):
    """
    Extrai as camadas reais do container HDF5 (NISAR_L2_GUNW)
    e salva em JSON leve para leitura instantânea no FastAPI.
    """
    grid_base = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram"
    hh_base = f"{grid_base}/HH"
    meta_grid = "/science/LSAR/GUNW/metadata/radarGrid"

    with h5py.File(h5_filepath, "r") as f:
        x_coords = f[f"{grid_base}/xCoordinates"][:]
        y_coords = f[f"{grid_base}/yCoordinates"][:]

        unw_phase = f[f"{hh_base}/unwrappedPhase"][:]
        coherence = f[f"{hh_base}/coherenceMagnitude"][:]
        conn_comp = f[f"{hh_base}/connectedComponents"][:]
        iono_screen = f[f"{hh_base}/ionospherePhaseScreen"][:]
        iono_uncert = f[f"{hh_base}/ionospherePhaseScreenUncertainty"][:]

        rx = f[f"{meta_grid}/xCoordinates"][:]
        ry = f[f"{meta_grid}/yCoordinates"][:]
        wet_tropo = f[f"{meta_grid}/wetTroposphericPhaseScreen"][0, :, :]
        hydro_tropo = f[f"{meta_grid}/hydrostaticTroposphericPhaseScreen"][0, :, :]
        solid_tides = f[f"{meta_grid}/solidEarthTidesPhase"][0, :, :]
        los_x = float(np.nanmean(f[f"{meta_grid}/losUnitVectorX"][0, :, :]))
        los_y = float(np.nanmean(f[f"{meta_grid}/losUnitVectorY"][0, :, :]))
        inc_angle = float(np.nanmean(f[f"{meta_grid}/incidenceAngle"][0, :, :]))
        elev_angle = float(np.nanmean(f[f"{meta_grid}/elevationAngle"][0, :, :]))

    yy, xx = np.meshgrid(y_coords, x_coords, indexing="ij")
    pts = np.array([yy.ravel(), xx.ravel()]).T

    interp_wet = RegularGridInterpolator((ry, rx), wet_tropo, bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)
    interp_hydro = RegularGridInterpolator((ry, rx), hydro_tropo, bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)
    interp_tides = RegularGridInterpolator((ry, rx), solid_tides, bounds_error=False, fill_value=0.0)(pts).reshape(unw_phase.shape)

    payload = {
        "los_vector": {
            "losUnitVectorX": round(los_x, 4),
            "losUnitVectorY": round(los_y, 4),
            "incidenceAngle": round(inc_angle, 2),
            "elevationAngle": round(elev_angle, 2),
        },
        "raw_los_mm": (unw_phase * PHASE_TO_MM).tolist(),
        "iono_mm": (iono_screen * PHASE_TO_MM).tolist(),
        "tropo_mm": ((interp_wet + interp_hydro) * PHASE_TO_MM).tolist(),
        "tides_mm": (interp_tides * PHASE_TO_MM).tolist(),
        "coherence": coherence.tolist(),
        "connected_components": conn_comp.tolist(),
        "iono_uncertainty_rad": iono_uncert.tolist(),
    }

    with open(output_json, "w", encoding="utf-8") as out:
        json.dump(payload, out)
