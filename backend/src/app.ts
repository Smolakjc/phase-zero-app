import Fastify, { FastifyError, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { ZodError } from "zod";
import { AppConfig, config as defaultConfig } from "./config.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { healthRoutes } from "./routes/health.js";
import { scenariosRoutes } from "./routes/scenarios.js";
import { PipelineDependencies } from "./services/pipeline.js";

export interface BuildAppOptions {
  config?: AppConfig;
  logger?: boolean;
  pipelineDeps?: Partial<PipelineDependencies>;
}

/**
 * Factory testável do servidor Fastify (`S-B3`).
 * Configura CORS, Zod Type Provider, redact de `earthdata_token` no logger pino
 * e error handler padronizado `{ error, message }`.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const cfg = options.config ?? defaultConfig;
  const enableLogger = options.logger ?? cfg.NODE_ENV !== "test";

  const app = Fastify({
    logger: enableLogger
      ? {
          level: "info",
          redact: {
            paths: [
              "req.body.earthdata_token",
              "body.earthdata_token",
              "earthdata_token",
              "req.headers.authorization",
              "headers.authorization",
            ],
            censor: "[REDACTED]",
          },
        }
      : false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const corsOrigin =
    cfg.CORS_ORIGIN === "*"
      ? true
      : cfg.CORS_ORIGIN.split(",").map((s) => s.trim());

  await app.register(cors, {
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof ZodError || (error as FastifyError).validation) {
      reply.status(400).send({
        error: "ValidationError",
        message: error.message,
      });
      return;
    }

    const statusCode =
      typeof (error as FastifyError).statusCode === "number" &&
      (error as FastifyError).statusCode! >= 400
        ? (error as FastifyError).statusCode!
        : 500;

    reply.status(statusCode).send({
      error: error.name || "InternalServerError",
      message: error.message || "Erro interno ao processar a análise.",
    });
  });

  await app.register(healthRoutes);
  await app.register(scenariosRoutes);
  await app.register(analyzeRoutes, { pipelineDeps: options.pipelineDeps });

  return app;
}

