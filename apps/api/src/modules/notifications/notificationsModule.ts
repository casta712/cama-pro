import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import type { NotificadorDeCambioServicio } from "../bookings/index.js";
import { PrismaNotificacionRepository } from "./infrastructure/PrismaNotificacionRepository.js";
import { NotificadorDeCambioServicioEnDB } from "./infrastructure/NotificadorDeCambioServicioEnDB.js";
import { ListarMisAvisos } from "./application/ListarMisAvisos.js";
import { ContarMisAvisosNoLeidos } from "./application/ContarMisAvisosNoLeidos.js";
import { MarcarAvisoComoLeido } from "./application/MarcarAvisoComoLeido.js";
import { MarcarTodosMisAvisosComoLeidos } from "./application/MarcarTodosMisAvisosComoLeidos.js";
import { AvisoController } from "./presentation/avisoController.js";
import { avisoRoutes } from "./presentation/avisoRoutes.js";

export interface NotificationsModuleDeps {
  prisma: PrismaClient;
  authMiddleware: RequestHandler;
  requireCamarero: RequestHandler;
}

export interface NotificationsModule {
  routes: Router;
  /**
   * Implementacion del puerto que bookings inyecta para emitir avisos
   * cuando se cancela o edita un servicio con asignaciones.
   */
  notificador: NotificadorDeCambioServicio;
}

export function buildNotificationsModule(
  deps: NotificationsModuleDeps,
): NotificationsModule {
  const repo = new PrismaNotificacionRepository(deps.prisma);

  const listarUC = new ListarMisAvisos(repo);
  const contarUC = new ContarMisAvisosNoLeidos(repo);
  const marcarLeidoUC = new MarcarAvisoComoLeido(repo);
  const marcarTodosUC = new MarcarTodosMisAvisosComoLeidos(repo);

  const controller = new AvisoController(
    listarUC,
    contarUC,
    marcarLeidoUC,
    marcarTodosUC,
  );
  const routes = avisoRoutes(controller, deps.authMiddleware, deps.requireCamarero);

  const notificador = new NotificadorDeCambioServicioEnDB(repo);

  return { routes, notificador };
}
