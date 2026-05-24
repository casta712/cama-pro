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
import type { EstadoCuentaCamarero } from "./domain/Camarero.js";

/**
 * DTO con la informacion minima que otros modulos necesitan saber de un
 * Camarero. NO se expone la entidad de dominio para no crear dependencias
 * cross-context sobre los internals de staff (ver CLAUDE.md seccion 1.2).
 */
export interface CamareroInfo {
  id: string;
  estadoCuenta: EstadoCuentaCamarero;
  puedeAceptarServicios: boolean;
}

/**
 * Datos de contacto que otros modulos pueden necesitar de un camarero
 * (ej. bookings para mostrar al gestor quien ha aceptado un servicio).
 * Mantenemos `bio` y `creadoEn` fuera para no filtrar mas de lo necesario.
 */
export interface CamareroContacto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
}

/**
 * API publica del modulo Staff (consumible por otros modulos via composicion).
 * - `obtenerCamareroInfo` se usa desde bookings para validar que un camarero
 *   esta ACTIVO antes de permitirle aceptar un servicio.
 * - `obtenerCamarerosContactoBatch` se usa desde bookings para enriquecer la
 *   lista de asignaciones con los datos de contacto de cada camarero.
 */
export interface StaffPublicApi {
  obtenerCamareroInfo(id: string): Promise<CamareroInfo>;
  obtenerCamarerosContactoBatch(
    ids: ReadonlyArray<string>,
  ): Promise<CamareroContacto[]>;
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
      async obtenerCamareroInfo(id) {
        const c = await obtenerUC.execute(id);
        return {
          id: c.id,
          estadoCuenta: c.estadoCuenta,
          puedeAceptarServicios: c.puedeAceptarServicios,
        };
      },
      async obtenerCamarerosContactoBatch(ids) {
        const lista = await camareros.findManyByIds(ids);
        return lista.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          email: c.email,
          telefono: c.telefono,
        }));
      },
    },
  };
}
