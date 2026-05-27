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
  router.patch("/:id", deps.authMiddleware, deps.requireGestor, controller.editarHandler);
  router.post("/:id/cancelar", deps.authMiddleware, deps.requireGestor, controller.cancelarHandler);
  router.get(
    "/:id/asignaciones",
    deps.authMiddleware,
    deps.requireGestor,
    controller.asignacionesDeServicioHandler,
  );

  // Rutas del CAMARERO
  router.get("/disponibles", deps.authMiddleware, deps.requireCamarero, controller.listarDisponiblesHandler);
  router.get("/mis-asignaciones", deps.authMiddleware, deps.requireCamarero, controller.misAsignacionesHandler);
  router.post("/:id/aceptar", deps.authMiddleware, deps.requireCamarero, controller.aceptarHandler);
  router.delete(
    "/:id/mi-asignacion",
    deps.authMiddleware,
    deps.requireCamarero,
    controller.liberarAsignacionHandler,
  );

  // Detalle accesible a cualquier usuario autenticado (gestor o camarero).
  // Declarada al final para que /disponibles y /mis-asignaciones no caigan
  // en este patron con :id.
  router.get("/:id", deps.authMiddleware, controller.obtenerHandler);

  return router;
}
