import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma compartido (singleton).
 * Esta es la UNICA capa que puede importar Prisma. Ver CLAUDE.md seccion 1.1.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
