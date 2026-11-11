import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { AnalysisRequestSchema, AnalysisResponseSchema } from "@phase-zero/shared";
import { PipelineDependencies, runPhaseZeroPipeline } from "../services/pipeline.js";

export interface AnalyzeRouteOptions {
  pipelineDeps?: Partial<PipelineDependencies>;
}

export async function analyzeRoutes(
  app: FastifyInstance,
  opts: AnalyzeRouteOptions = {},
): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/api/analyze",
    {
      schema: {
        body: AnalysisRequestSchema,
        response: {
          200: AnalysisResponseSchema,
        },
      },
    },
    async (request) => {
      return runPhaseZeroPipeline(request.body, opts.pipelineDeps);
    },
  );
}

