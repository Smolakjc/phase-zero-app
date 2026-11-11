import { buildApp } from "./app.js";
import { config } from "./config.js";

async function start(): Promise<void> {
  const app = await buildApp({ config, logger: true });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(
      `PHASE-ZERO v5.0 Fastify Backend ouvindo em http://${config.HOST === "0.0.0.0" ? "localhost" : config.HOST}:${config.PORT}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

