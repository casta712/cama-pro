import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Carga `.env.test` directamente en `process.env` para que tanto el
// globalSetup (proceso principal) como los workers (via `test.env`) lo vean.
const dotEnv = loadDotEnvTest();
for (const [k, v] of Object.entries(dotEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

/**
 * Config de integracion: solo tests `*.integration.test.ts`.
 * - Carga `.env.test` (TEST_DATABASE_URL).
 * - Antes de la suite aplica el schema en la BD de tests via `prisma db push`.
 * - Tests usan PrismaClient apuntado a esa BD (helper `test-helpers/integrationDb`).
 *
 * Requiere Postgres corriendo (npm run db:up).
 */
export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
    globalSetup: ["./test-helpers/globalSetup.ts"],
    env: dotEnv,
    // Los tests de integracion comparten una BD: secuenciales para evitar carreras
    // entre suites (la concurrencia *dentro* de un test sigue probandose).
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});

function loadDotEnvTest(): Record<string, string> {
  // Lectura sincrona minima — evita depender de dotenv. Si no existe el
  // archivo, los tests fallaran con mensaje claro al verificar TEST_DATABASE_URL.
  const ruta = resolve(process.cwd(), ".env.test");
  if (!existsSync(ruta)) return {};

  const env: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const limpio = linea.trim();
    if (!limpio || limpio.startsWith("#")) continue;
    const idx = limpio.indexOf("=");
    if (idx === -1) continue;
    const k = limpio.slice(0, idx).trim();
    let v = limpio.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}
