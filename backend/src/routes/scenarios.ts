import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { DamsResponseSchema, ScenariosResponseSchema } from "@phase-zero/shared";
import { listDamCatalogItems, listScenarioItems } from "../domain/presets.js";

export async function scenariosRoutes(app: FastifyInstance): Promise<void> {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/api/scenarios",
    {
      schema: {
        response: {
          200: ScenariosResponseSchema,
        },
      },
    },
    async () => ({
      scenarios: listScenarioItems(),
    }),
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/api/dams",
    {
      schema: {
        response: {
          200: DamsResponseSchema,
        },
      },
    },
    async () => ({
      dams: listDamCatalogItems(),
    }),
  );
}

