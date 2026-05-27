import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import type {
  NotificadorDeCambioServicio,
  NotificadorDeMovimientoAsignacion,
} from "../bookings/index.js";
import { PrismaNotificacionRepository } from "./infrastructure/PrismaNotificacionRepository.js";
import {
  NotificadorDeCambioServicioEnDB,
  type ResolverUsuariosDeCamarerosFn,
} from "./infrastructure/NotificadorDeCambioServicioEnDB.js";
import {
  NotificadorDeMovimientoAsignacionEnDB,
  type ListarUsuariosGestorFn,
} from "./infrastructure/NotificadorDeMovimientoAsignacionEnDB.js";
import { ListarMisAvisos } from "./application/ListarMisAvisos.js";
import { ContarMisAvisosNoLeidos } from "./application/ContarMisAvisosNoLeidos.js";
import { MarcarAvisoComoLeido } from "./application/MarcarAvisoComoLeido.js";
import { MarcarTodosMisAvisosComoLeidos } from "./application/MarcarTodosMisAvisosComoLeidos.js";
import { AvisoController } from "./presentation/avisoController.js";
import { avisoRoutes } from "./presentation/avisoRoutes.js";

export interface NotificationsModuleDeps {
  prisma: PrismaClient;
  authMiddleware: RequestHandler;
  /** Cross-context (identity): camareroId -> Usuario.id. */
  resolverUsuariosDeCamareros: ResolverUsuariosDeCamarerosFn;
  /** Cross-context (identity): Usuario.id de todos los gestores. */
  listarGestorUsuarioIds: ListarUsuariosGestorFn;
}

export interface NotificationsModule {
  routes: Router;
  /** Avisos al camarero por cancelacion / edicion del servicio. */
  notificador: NotificadorDeCambioServicio;
  /** Avisos al gestor por movimientos en asignaciones (hoy: liberar). */
  notificadorMovimientoAsignacion: NotificadorDeMovimientoAsignacion;
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
  const routes = avisoRoutes(controller, deps.authMiddleware);

  const notificador = new NotificadorDeCambioServicioEnDB(
    repo,
    deps.resolverUsuariosDeCamareros,
  );
  const notificadorMovimientoAsignacion =
    new NotificadorDeMovimientoAsignacionEnDB(
      repo,
      deps.listarGestorUsuarioIds,
    );

  return { routes, notificador, notificadorMovimientoAsignacion };
}
