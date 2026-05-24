import type { PrismaClient } from "@prisma/client";
import { buildIdentityModule, type IdentityModule } from "./identity/index.js";
import { buildStaffModule, type StaffModule } from "./staff/index.js";
import { buildBookingsModule, type BookingsModule } from "./bookings/index.js";

/**
 * Wiring central de modulos.
 * Cada modulo recibe sus dependencias aqui. La comunicacion entre modulos
 * pasa por la `publicApi` de cada uno (nunca por importacion interna).
 */
export interface AppModules {
  identity: IdentityModule;
  staff: StaffModule;
  bookings: BookingsModule;
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

  const bookings = buildBookingsModule({
    prisma,
    verificarCamarero: (camareroId) =>
      staff.publicApi
        .obtenerCamareroInfo(camareroId)
        .then((c) => ({ puedeAceptarServicios: c.puedeAceptarServicios })),
    obtenerCamarerosContacto: (ids) =>
      staff.publicApi.obtenerCamarerosContactoBatch(ids),
    authMiddleware: identity.middleware.auth,
    requireGestor: identity.middleware.requireRol("GESTOR"),
    requireCamarero: identity.middleware.requireRol("CAMARERO"),
  });

  return { identity, staff, bookings };
}
