import type { Request, Response, NextFunction } from "express";
import { CambiarPasswordInput, LoginInput } from "@cama-pro/shared-types";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { AutenticarUsuario } from "../application/AutenticarUsuario.js";
import type { CambiarPassword } from "../application/CambiarPassword.js";
import type { ObtenerUsuarioActual } from "../application/ObtenerUsuarioActual.js";

export class AuthController {
  constructor(
    private readonly autenticar: AutenticarUsuario,
    private readonly obtenerActual: ObtenerUsuarioActual,
    private readonly cambiarPasswordUc: CambiarPassword,
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = LoginInput.parse(req.body);
      const out = await this.autenticar.execute(input);
      res.json(out);
    } catch (err) {
      next(err);
    }
  };

  cambiarPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        throw new UnauthorizedError();
      }
      const input = CambiarPasswordInput.parse(req.body);
      await this.cambiarPasswordUc.execute({
        usuarioId: req.usuario.id,
        passwordActual: input.passwordActual,
        passwordNueva: input.passwordNueva,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        throw new UnauthorizedError();
      }
      const usuario = await this.obtenerActual.execute(req.usuario.id);
      res.json({
        id: usuario.id,
        email: usuario.email.value,
        rol: usuario.rol,
        camareroId: usuario.camareroId,
      });
    } catch (err) {
      next(err);
    }
  };
}
