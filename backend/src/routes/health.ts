import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("phase-zero-backend"),
  version: z.literal("5.0.0"),
});

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/api/health",
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok" as const,
      service: "phase-zero-backend" as const,
      version: "5.0.0" as const,
    }),
  );
}

