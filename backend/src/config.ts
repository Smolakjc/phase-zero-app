import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

if (typeof process.loadEnvFile === "function") {
  const envCandidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend", ".env"),
    path.resolve(currentDir, "../.env"),
    path.resolve(currentDir, "../../.env"),
  ];
  for (const candidate of envCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        process.loadEnvFile(candidate);
        break;
      }
    } catch {
      // Ignora se o arquivo não existir ou não for legível
    }
  }
}

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("*"),
  MAX_GRANULE_MB: z.coerce.number().positive().default(600),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  EARTHDATA_TOKEN: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}

export const config: AppConfig = loadConfig();
