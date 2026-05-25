import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../../shared/errors/AppError.js";
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
      const camareroId = requireCamarero(req);
      const avisos = await this.listarUC.execute(camareroId);
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
      const camareroId = requireCamarero(req);
      const total = await this.contarUC.execute(camareroId);
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
      const camareroId = requireCamarero(req);
      const { id } = IdParam.parse(req.params);
      await this.marcarLeidoUC.execute({
        camareroId,
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
      const camareroId = requireCamarero(req);
      await this.marcarTodosUC.execute(camareroId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

function requireCamarero(req: Request): string {
  if (!req.usuario) throw new UnauthorizedError();
  if (!req.usuario.camareroId) {
    throw new ForbiddenError("Solo camareros pueden acceder a sus avisos");
  }
  return req.usuario.camareroId;
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
