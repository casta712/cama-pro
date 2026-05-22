import { Router, type RequestHandler } from "express";
import type { ServicioController } from "./servicioController.js";

export interface ServicioRoutesDeps {
  authMiddleware: RequestHandler;
  requireGestor: RequestHandler;
  requireCamarero: RequestHandler;
}

export function servicioRoutes(
  controller: ServicioController,
  deps: ServicioRoutesDeps,
): Router {
  const router = Router();

  // Rutas del GESTOR
  router.post("/", deps.authMiddleware, deps.requireGestor, controller.crearHandler);
  router.get("/", deps.authMiddleware, deps.requireGestor, controller.listarGestorHandler);
  router.post("/:id/cancelar", deps.authMiddleware, deps.requireGestor, controller.cancelarHandler);

  // Rutas del CAMARERO
  router.get("/disponibles", deps.authMiddleware, deps.requireCamarero, controller.listarDisponiblesHandler);
  router.get("/mis-asignaciones", deps.authMiddleware, deps.requireCamarero, controller.misAsignacionesHandler);
  router.post("/:id/aceptar", deps.authMiddleware, deps.requireCamarero, controller.aceptarHandler);

  return router;
}
