import { Router, type RequestHandler } from "express";
import type { AvisoController } from "./avisoController.js";

export function avisoRoutes(
  controller: AvisoController,
  authMiddleware: RequestHandler,
  requireCamarero: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware, requireCamarero);
  router.get("/", controller.listar);
  router.get("/no-leidos/count", controller.contarNoLeidos);
  router.post("/leer-todos", controller.marcarTodosLeidos);
  router.patch("/:id/leer", controller.marcarLeido);
  return router;
}
