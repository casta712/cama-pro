import express from "express";
import cors from "cors";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/http/errorHandler.js";

export function buildServer() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Rutas de modulos se montan aqui (proximas tareas):
  // app.use("/api/auth", identityRoutes);
  // app.use("/api/camareros", staffRoutes);
  // app.use("/api/servicios", bookingsRoutes);

  app.use(errorHandler);

  return app;
}
