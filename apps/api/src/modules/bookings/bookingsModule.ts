import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import { PrismaServicioRepository } from "./infrastructure/PrismaServicioRepository.js";
import { CrearServicio } from "./application/CrearServicio.js";
import { EditarServicio } from "./application/EditarServicio.js";
import {
  AceptarServicio,
  type VerificarCamareroFn,
} from "./application/AceptarServicio.js";
import { CancelarServicio } from "./application/CancelarServicio.js";
import type { NotificadorDeCambioServicio } from "./domain/ports/NotificadorDeCambioServicio.js";
import { ObtenerServicio } from "./application/ObtenerServicio.js";
import { ListarServiciosDisponibles } from "./application/ListarServiciosDisponibles.js";
import { ListarServiciosDelGestor } from "./application/ListarServiciosDelGestor.js";
import { ListarMisAsignaciones } from "./application/ListarMisAsignaciones.js";
import {
  ListarAsignacionesDeServicio,
  type ObtenerCamarerosContactoFn,
} from "./application/ListarAsignacionesDeServicio.js";
import { ServicioController } from "./presentation/servicioController.js";
import { servicioRoutes } from "./presentation/servicioRoutes.js";

export interface BookingsModuleDeps {
  prisma: PrismaClient;
  verificarCamarero: VerificarCamareroFn;
  obtenerCamarerosContacto: ObtenerCamarerosContactoFn;
  notificador: NotificadorDeCambioServicio;
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
  const editar = new EditarServicio(repo, deps.notificador);
  const aceptar = new AceptarServicio(repo, deps.verificarCamarero);
  const cancelar = new CancelarServicio(repo, deps.notificador);
  const obtener = new ObtenerServicio(repo);
  const listarDisponibles = new ListarServiciosDisponibles(repo);
  const listarGestor = new ListarServiciosDelGestor(repo);
  const listarMisAsignaciones = new ListarMisAsignaciones(repo);
  const listarAsignaciones = new ListarAsignacionesDeServicio(
    repo,
    deps.obtenerCamarerosContacto,
  );

  const controller = new ServicioController(
    crear,
    editar,
    aceptar,
    cancelar,
    obtener,
    listarDisponibles,
    listarGestor,
    listarMisAsignaciones,
    listarAsignaciones,
  );

  const routes = servicioRoutes(controller, {
    authMiddleware: deps.authMiddleware,
    requireGestor: deps.requireGestor,
    requireCamarero: deps.requireCamarero,
  });

  return { routes };
}
