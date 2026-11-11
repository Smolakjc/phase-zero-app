import { z } from "zod";
import { AppError } from "../utils/errors.js";

/**
 * Locais conhecidos que o frontend referencia por `scenario_id`.
 * São apenas coordenadas: os dados vêm sempre dos satélites.
 * Qualquer outro id (ex.: "custom") exige `custom_lat`/`custom_lon`.
 */
const KNOWN_SITES = {
  itaipu_normal: { name: "Usina de Itaipu (Foz do Iguaçu, PR)", lat: -25.408, lon: -54.588 },
  gongo_soco_active: { name: "Talude Gongo Soco / Sul Superior (Barão de Cocais, MG)", lat: -19.963, lon: -43.593 },
  maceio_subsidence: { name: "Subsidência Mutange/Pinheiro (Maceió, AL)", lat: -9.632, lon: -35.748 },
  brumadinho_hist: { name: "Barragem B1 (Brumadinho, MG)", lat: -20.119, lon: -44.121 },
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD.")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Data inválida.");

const requestSchema = z.object({
  scenario_id: z.string().default("custom"),
  apply_ionosphere: z.boolean().default(true),
  apply_troposphere: z.boolean().default(true),
  apply_solid_tides: z.boolean().default(true),
  apply_nasa_power: z.boolean().default(true),
  min_coherence: z.number().min(0).max(1).default(0.4),
  start_date: isoDate,
  end_date: isoDate,
  custom_lat: z.number().min(-90).max(90).nullish(),
  custom_lon: z.number().min(-180).max(180).nullish(),
  custom_name: z.string().trim().max(120).nullish(),
  earthdata_token: z.string().trim().nullish(),
});

const MAX_WINDOW_DAYS = 730;

/**
 * Valida o corpo da requisição e resolve o alvo (nome + coordenadas).
 * Lança `AppError(400)` com mensagem legível em caso de problema.
 */
export function parseAnalysisRequest(body) {
  const parsed = requestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(400, `Parâmetro inválido (${issue.path.join(".") || "corpo"}): ${issue.message}`);
  }
  const req = parsed.data;

  const days = (Date.parse(req.end_date) - Date.parse(req.start_date)) / 86_400_000;
  if (days <= 0) throw new AppError(400, "end_date deve ser posterior a start_date.");
  if (days > MAX_WINDOW_DAYS) throw new AppError(400, `O período máximo é de ${MAX_WINDOW_DAYS} dias.`);

  const site = KNOWN_SITES[req.scenario_id];
  let target;
  if (site) {
    target = site;
  } else if (typeof req.custom_lat === "number" && typeof req.custom_lon === "number") {
    target = {
      name: `${req.custom_name || "Coordenada livre"} (${req.custom_lat.toFixed(5)}, ${req.custom_lon.toFixed(5)})`,
      lat: req.custom_lat,
      lon: req.custom_lon,
    };
  } else {
    throw new AppError(400, "Informe custom_lat e custom_lon, ou um scenario_id conhecido.");
  }

  return {
    target,
    options: {
      applyIonosphere: req.apply_ionosphere,
      applyTroposphere: req.apply_troposphere,
      applySolidTides: req.apply_solid_tides,
      applyNasaPower: req.apply_nasa_power,
      minCoherence: req.min_coherence,
    },
    startDate: req.start_date,
    endDate: req.end_date,
    token: req.earthdata_token || "",
  };
}
