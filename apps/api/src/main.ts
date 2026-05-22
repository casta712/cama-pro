import { buildServer } from "./server.js";
import { env } from "./shared/config/env.js";

const app = buildServer();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] escuchando en http://localhost:${env.PORT}`);
});

const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[api] recibido ${signal}, cerrando...`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
