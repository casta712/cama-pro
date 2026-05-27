import { Router, type RequestHandler } from "express";
import type { AvisoController } from "./avisoController.js";

/**
 * Rutas de avisos. Solo exige auth: el destinatario se deriva de
 * req.usuario.id, asi que sirve tanto a camareros como a gestores.
 */
export function avisoRoutes(
  controller: AvisoController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get("/", controller.listar);
  router.get("/no-leidos/count", controller.contarNoLeidos);
  router.post("/leer-todos", controller.marcarTodosLeidos);
  router.patch("/:id/leer", controller.marcarLeido);
  return router;
}
