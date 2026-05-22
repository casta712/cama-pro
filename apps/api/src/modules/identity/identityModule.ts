import type { PrismaClient } from "@prisma/client";
import type { Router, RequestHandler } from "express";
import { env } from "../../shared/config/env.js";
import { PrismaUsuarioRepository } from "./infrastructure/PrismaUsuarioRepository.js";
import { BcryptPasswordHasher } from "./infrastructure/BcryptPasswordHasher.js";
import { JwtTokenService } from "./infrastructure/JwtTokenService.js";
import { CrearUsuario, type CrearUsuarioInput } from "./application/CrearUsuario.js";
import { AutenticarUsuario } from "./application/AutenticarUsuario.js";
import { ObtenerUsuarioActual } from "./application/ObtenerUsuarioActual.js";
import { AuthController } from "./presentation/authController.js";
import { createAuthMiddleware, requireRol } from "./presentation/authMiddleware.js";
import { authRoutes } from "./presentation/authRoutes.js";
import type { Rol } from "./domain/Usuario.js";

/**
 * API publica del modulo Identity.
 * Es lo unico que otros modulos pueden consumir. NUNCA importar codigo
 * interno del modulo desde fuera.
 */
export interface IdentityPublicApi {
  crearUsuario(input: CrearUsuarioInput): Promise<{ id: string; email: string; rol: Rol }>;
}

export interface IdentityModule {
  routes: Router;
  middleware: {
    auth: RequestHandler;
    requireRol: (...roles: ReadonlyArray<Rol>) => RequestHandler;
  };
  publicApi: IdentityPublicApi;
}

export function buildIdentityModule(prisma: PrismaClient): IdentityModule {
  const usuarios = new PrismaUsuarioRepository(prisma);
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);

  const crearUsuarioUC = new CrearUsuario(usuarios, hasher);
  const autenticarUC = new AutenticarUsuario(usuarios, hasher, tokens);
  const obtenerActualUC = new ObtenerUsuarioActual(usuarios);

  const controller = new AuthController(autenticarUC, obtenerActualUC);
  const authMw = createAuthMiddleware(tokens);
  const routes = authRoutes(controller, authMw);

  return {
    routes,
    middleware: { auth: authMw, requireRol },
    publicApi: {
      async crearUsuario(input) {
        const u = await crearUsuarioUC.execute(input);
        return { id: u.id, email: u.email.value, rol: u.rol };
      },
    },
  };
}
