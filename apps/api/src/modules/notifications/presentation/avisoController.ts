import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { ContarMisAvisosNoLeidos } from "../application/ContarMisAvisosNoLeidos.js";
import type { ListarMisAvisos } from "../application/ListarMisAvisos.js";
import type { MarcarAvisoComoLeido } from "../application/MarcarAvisoComoLeido.js";
import type { MarcarTodosMisAvisosComoLeidos } from "../application/MarcarTodosMisAvisosComoLeidos.js";
import type { Notificacion } from "../domain/Notificacion.js";

const IdParam = z.object({ id: z.string().uuid() });

export class AvisoController {
  constructor(
    private readonly listarUC: ListarMisAvisos,
    private readonly contarUC: ContarMisAvisosNoLeidos,
    private readonly marcarLeidoUC: MarcarAvisoComoLeido,
    private readonly marcarTodosUC: MarcarTodosMisAvisosComoLeidos,
  ) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuarioId = requireUsuario(req);
      const avisos = await this.listarUC.execute(usuarioId);
      res.json({ items: avisos.map(toDTO) });
    } catch (err) {
      next(err);
    }
  };

  contarNoLeidos = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuarioId = requireUsuario(req);
      const total = await this.contarUC.execute(usuarioId);
      res.json({ total });
    } catch (err) {
      next(err);
    }
  };

  marcarLeido = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuarioId = requireUsuario(req);
      const { id } = IdParam.parse(req.params);
      await this.marcarLeidoUC.execute({
        usuarioId,
        avisoId: id,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  marcarTodosLeidos = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuarioId = requireUsuario(req);
      await this.marcarTodosUC.execute(usuarioId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

function requireUsuario(req: Request): string {
  if (!req.usuario) throw new UnauthorizedError();
  return req.usuario.id;
}

function toDTO(n: Notificacion) {
  return {
    id: n.id,
    tipo: n.tipo,
    servicioId: n.servicioId,
    payload: n.payload,
    leidaEn: n.leidaEn?.toISOString() ?? null,
    creadaEn: n.creadaEn.toISOString(),
  };
}
