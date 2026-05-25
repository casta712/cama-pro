import { PrismaClient } from "@prisma/client";

let cliente: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL no esta definido (revisa apps/api/.env.test)");
  }
  if (!cliente) {
    cliente = new PrismaClient({ datasourceUrl: url });
  }
  return cliente;
}

/** Borra el contenido de todas las tablas (deja el schema intacto). */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  // El orden importa: hijas antes que padres. Cascade evita problemas si lo
  // hubieramos cambiado, pero ser explicito documenta el grafo de deps.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "asignaciones", "servicios", "usuarios", "camareros" RESTART IDENTITY CASCADE',
  );
}

export async function disconnectTestPrisma(): Promise<void> {
  if (cliente) {
    await cliente.$disconnect();
    cliente = null;
  }
}
