import { execSync } from "node:child_process";

/**
 * Vitest globalSetup: aplica el esquema Prisma en la BD de tests.
 * Se ejecuta UNA vez antes de toda la suite de integracion.
 */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL no esta definido. Copia apps/api/.env.test.example a .env.test " +
        "y asegurate de que la BD existe (npm run db:up + CREATE DATABASE cama_pro_test).",
    );
  }

  // `prisma db push` sincroniza el schema sin generar migraciones nuevas. Es
  // lo que queremos para una BD efimera de tests. `--accept-data-loss` permite
  // que columnas viejas se eliminen sin prompt interactivo.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
