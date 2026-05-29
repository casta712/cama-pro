import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/http/errorHandler.js";
import { prisma } from "./shared/infrastructure/prisma.js";
import { buildModules } from "./modules/index.js";

// dist/server.js -> ../../web/dist (la SPA compilada, en despliegue de servicio unico)
const WEB_DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");

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
  app.use("/api/avisos", modules.notifications.routes);

  if (env.NODE_ENV !== "test" && existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(join(WEB_DIST, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
