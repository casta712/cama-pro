import type { PrismaClient } from "@prisma/client";
import { buildIdentityModule, type IdentityModule } from "./identity/index.js";

/**
 * Wiring central de modulos.
 * Cada modulo recibe sus dependencias aqui. La comunicacion entre modulos
 * pasa por la `publicApi` de cada uno (nunca por importacion interna).
 */
export interface AppModules {
  identity: IdentityModule;
}

export function buildModules(prisma: PrismaClient): AppModules {
  const identity = buildIdentityModule(prisma);
  // Proximas tareas:
  // const staff    = buildStaffModule(prisma, identity.publicApi);
  // const bookings = buildBookingsModule(prisma);
  return { identity };
}
