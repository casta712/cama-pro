import { Router, type RequestHandler } from "express";
import type { AuthController } from "./authController.js";

export function authRoutes(
  controller: AuthController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.post("/login", controller.login);
  router.get("/me", authMiddleware, controller.me);
  return router;
}
