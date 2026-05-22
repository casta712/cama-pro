import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const GESTOR_EMAIL = process.env.SEED_GESTOR_EMAIL ?? "gestor@cama-pro.local";
const GESTOR_PASSWORD = process.env.SEED_GESTOR_PASSWORD ?? "cambiar-en-prod-1234";

async function main(): Promise<void> {
  const existente = await prisma.usuario.findUnique({
    where: { email: GESTOR_EMAIL },
  });
  if (existente) {
    // eslint-disable-next-line no-console
    console.log(`[seed] Gestor ya existe: ${GESTOR_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(GESTOR_PASSWORD, 10);
  await prisma.usuario.create({
    data: {
      id: randomUUID(),
      email: GESTOR_EMAIL,
      passwordHash,
      rol: "GESTOR",
    },
  });

  // eslint-disable-next-line no-console
  console.log(`[seed] Gestor creado: ${GESTOR_EMAIL}`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Password inicial: ${GESTOR_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log("[seed] ATENCION: cambia la password tras el primer login.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[seed] error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
