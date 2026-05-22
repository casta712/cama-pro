import express from "express";
import cors from "cors";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/http/errorHandler.js";
import { prisma } from "./shared/infrastructure/prisma.js";
import { buildModules } from "./modules/index.js";

export function buildServer() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const modules = buildModules(prisma);
  app.use("/api/auth", modules.identity.routes);
  app.use("/api/camareros", modules.staff.routes);
  app.use("/api/servicios", modules.bookings.routes);

  app.use(errorHandler);
  return app;
}
