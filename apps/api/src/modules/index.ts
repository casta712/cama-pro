import type { PrismaClient } from "@prisma/client";
import { buildIdentityModule, type IdentityModule } from "./identity/index.js";
import { buildStaffModule, type StaffModule } from "./staff/index.js";

/**
 * Wiring central de modulos.
 * Cada modulo recibe sus dependencias aqui. La comunicacion entre modulos
 * pasa por la `publicApi` de cada uno (nunca por importacion interna).
 */
export interface AppModules {
  identity: IdentityModule;
  staff: StaffModule;
}

export function buildModules(prisma: PrismaClient): AppModules {
  const identity = buildIdentityModule(prisma);

  const staff = buildStaffModule({
    prisma,
    crearUsuarioCamarero: (input) =>
      identity.publicApi.crearUsuario(input).then((u) => ({ id: u.id })),
    authMiddleware: identity.middleware.auth,
    requireGestor: identity.middleware.requireRol("GESTOR"),
  });

  // Proxima tarea:
  // const bookings = buildBookingsModule({ prisma, staffPublicApi: staff.publicApi, ... });

  return { identity, staff };
}
