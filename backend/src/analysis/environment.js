import { ENV_MODEL } from "../constants.js";

/**
 * Deslocamento esperado (mm) só por efeito ambiental, para uma data.
 *
 * Modelo linear sobre os desvios do clima em relação à média da janela
 * (temperatura de superfície, irradiância solar e chuva). Dias sem dado de um
 * parâmetro usam a média da janela, ou seja, contribuição neutra (0 mm).
 */
export function expectedEnvironmentalMm(day, means) {
  if (!day) return 0;
  const delta = (value, reference) => (value === null || value === undefined ? 0 : value - reference);
  return (
    ENV_MODEL.surfaceTempMmPerC * delta(day.ts, means.ts) +
    ENV_MODEL.solarMmPerWm2 * delta(day.sw, means.sw) +
    ENV_MODEL.precipMmPerMm * delta(day.precip, means.precip)
  );
}
