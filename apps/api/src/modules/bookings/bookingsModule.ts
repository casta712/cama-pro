import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import { PrismaServicioRepository } from "./infrastructure/PrismaServicioRepository.js";
import { CrearServicio } from "./application/CrearServicio.js";
import {
  AceptarServicio,
  type VerificarCamareroFn,
} from "./application/AceptarServicio.js";
import { CancelarServicio } from "./application/CancelarServicio.js";
import { ListarServiciosDisponibles } from "./application/ListarServiciosDisponibles.js";
import { ListarServiciosDelGestor } from "./application/ListarServiciosDelGestor.js";
import { ListarMisAsignaciones } from "./application/ListarMisAsignaciones.js";
import { ServicioController } from "./presentation/servicioController.js";
import { servicioRoutes } from "./presentation/servicioRoutes.js";

export interface BookingsModuleDeps {
  prisma: PrismaClient;
  verificarCamarero: VerificarCamareroFn;
  authMiddleware: RequestHandler;
  requireGestor: RequestHandler;
  requireCamarero: RequestHandler;
}

export interface BookingsModule {
  routes: Router;
}

export function buildBookingsModule(deps: BookingsModuleDeps): BookingsModule {
  const repo = new PrismaServicioRepository(deps.prisma);

  const crear = new CrearServicio(repo);
  const aceptar = new AceptarServicio(repo, deps.verificarCamarero);
  const cancelar = new CancelarServicio(repo);
  const listarDisponibles = new ListarServiciosDisponibles(repo);
  const listarGestor = new ListarServiciosDelGestor(repo);
  const listarMisAsignaciones = new ListarMisAsignaciones(repo);

  const controller = new ServicioController(
    crear,
    aceptar,
    cancelar,
    listarDisponibles,
    listarGestor,
    listarMisAsignaciones,
  );

  const routes = servicioRoutes(controller, {
    authMiddleware: deps.authMiddleware,
    requireGestor: deps.requireGestor,
    requireCamarero: deps.requireCamarero,
  });

  return { routes };
}
