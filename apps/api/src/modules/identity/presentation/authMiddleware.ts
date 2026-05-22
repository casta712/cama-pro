import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  UnauthorizedError,
  ForbiddenError,
} from "../../../shared/errors/AppError.js";
import type { TokenService } from "../domain/ports/TokenService.js";
import type { Rol } from "../domain/Usuario.js";

declare module "express-serve-static-core" {
  interface Request {
    usuario?: {
      id: string;
      rol: Rol;
      camareroId: string | null;
    };
  }
}

const PREFIX = "Bearer ";

export function createAuthMiddleware(tokens: TokenService): RequestHandler {
  return function authMiddleware(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith(PREFIX)) {
      return next(new UnauthorizedError("Falta token Bearer"));
    }
    const token = header.slice(PREFIX.length);
    try {
      const payload = tokens.verify(token);
      req.usuario = {
        id: payload.sub,
        rol: payload.rol,
        camareroId: payload.camareroId,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRol(...roles: ReadonlyArray<Rol>): RequestHandler {
  return function (req: Request, _res: Response, next: NextFunction) {
    if (!req.usuario) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.usuario.rol)) {
      return next(new ForbiddenError(`Requiere rol: ${roles.join(", ")}`));
    }
    next();
  };
}
