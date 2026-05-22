import { Router, type RequestHandler } from "express";
import type { CamareroController } from "./camareroController.js";

export function camareroRoutes(
  controller: CamareroController,
  authMiddleware: RequestHandler,
  requireGestor: RequestHandler,
): Router {
  const router = Router();

  // Publico: autoregistro de camarero (queda PENDIENTE_APROBACION).
  router.post("/registro", controller.registro);

  // Solo gestor: listado y administracion del equipo.
  router.get("/", authMiddleware, requireGestor, controller.list);
  router.post("/:id/aprobar", authMiddleware, requireGestor, controller.aprobarHandler);
  router.post("/:id/suspender", authMiddleware, requireGestor, controller.suspenderHandler);

  return router;
}
