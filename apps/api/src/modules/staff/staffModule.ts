import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import { PrismaCamareroRepository } from "./infrastructure/PrismaCamareroRepository.js";
import {
  RegistrarCamarero,
  type CrearUsuarioCamareroFn,
} from "./application/RegistrarCamarero.js";
import { AprobarCamarero } from "./application/AprobarCamarero.js";
import { SuspenderCamarero } from "./application/SuspenderCamarero.js";
import { ListarCamareros } from "./application/ListarCamareros.js";
import { ObtenerCamarero } from "./application/ObtenerCamarero.js";
import { CamareroController } from "./presentation/camareroController.js";
import { camareroRoutes } from "./presentation/camareroRoutes.js";
import type { Camarero } from "./domain/Camarero.js";

/**
 * API publica del modulo Staff (consumible por otros modulos via composicion).
 * - `obtenerCamarero` se usara desde bookings para validar que un camarero
 *   esta ACTIVO antes de permitirle aceptar un servicio.
 */
export interface StaffPublicApi {
  obtenerCamarero(id: string): Promise<Camarero>;
}

export interface StaffModuleDeps {
  prisma: PrismaClient;
  crearUsuarioCamarero: CrearUsuarioCamareroFn;
  authMiddleware: RequestHandler;
  requireGestor: RequestHandler;
}

export interface StaffModule {
  routes: Router;
  publicApi: StaffPublicApi;
}

export function buildStaffModule(deps: StaffModuleDeps): StaffModule {
  const camareros = new PrismaCamareroRepository(deps.prisma);

  const registrarUC = new RegistrarCamarero(camareros, deps.crearUsuarioCamarero);
  const aprobarUC = new AprobarCamarero(camareros);
  const suspenderUC = new SuspenderCamarero(camareros);
  const listarUC = new ListarCamareros(camareros);
  const obtenerUC = new ObtenerCamarero(camareros);

  const controller = new CamareroController(
    registrarUC,
    aprobarUC,
    suspenderUC,
    listarUC,
  );
  const routes = camareroRoutes(controller, deps.authMiddleware, deps.requireGestor);

  return {
    routes,
    publicApi: {
      obtenerCamarero: (id) => obtenerUC.execute(id),
    },
  };
}
