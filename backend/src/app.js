import express from "express";
import cors from "cors";

import { config } from "./config.js";
import { AppError } from "./utils/errors.js";
import { parseAnalysisRequest } from "./analysis/request.js";
import { runAnalysis } from "./analysis/pipeline.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/api/analyze", async (req, res, next) => {
    try {
      res.json(await runAnalysis(parseAnalysisRequest(req.body)));
    } catch (err) {
      next(err);
    }
  });

  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  // Erros esperados (AppError) mostram a mensagem; qualquer outro vira 500 genérico
  // e o detalhe fica só no log do servidor (nunca vaza para o cliente).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON inválido." });
    console.error("[erro]", err);
    return res.status(500).json({ error: "Erro interno ao processar a análise." });
  });

  return app;
}
