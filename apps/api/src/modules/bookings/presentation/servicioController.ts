import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  CrearServicioInput as CrearServicioSchema,
  EditarServicioInput as EditarServicioSchema,
  EstadoServicio as EstadoServicioSchema,
  type AsignacionConCamareroDTO,
  type ServicioDTO,
} from "@cama-pro/shared-types";
import { UnauthorizedError, ForbiddenError } from "../../../shared/errors/AppError.js";
import type { Servicio } from "../domain/Servicio.js";
import type { CrearServicio } from "../application/CrearServicio.js";
import type { EditarServicio } from "../application/EditarServicio.js";
import type { AceptarServicio } from "../application/AceptarServicio.js";
import type { CancelarServicio } from "../application/CancelarServicio.js";
import type { ObtenerServicio } from "../application/ObtenerServicio.js";
import type { ListarServiciosDisponibles } from "../application/ListarServiciosDisponibles.js";
import type { ListarServiciosDelGestor } from "../application/ListarServiciosDelGestor.js";
import type { ListarMisAsignaciones } from "../application/ListarMisAsignaciones.js";
import type { ListarAsignacionesDeServicio } from "../application/ListarAsignacionesDeServicio.js";

const IdParam = z.object({ id: z.string().uuid() });
const GestorQuery = z.object({ estado: EstadoServicioSchema.optional() });

function toDTO(s: Servicio, camareroId?: string): ServicioDTO {
  return {
    id: s.id,
    fechaInicio: s.fechaInicio.toISOString(),
    duracionHoras: s.duracionHoras,
    lugar: s.lugar,
    tipoEvento: s.tipoEvento,
    cuposTotales: s.cuposTotales,
    cuposOcupados: s.cuposOcupados,
    uniforme: s.uniforme,
    notas: s.notas,
    estado: s.estadoActual(),
    ...(camareroId ? { yaAceptado: s.haAceptado(camareroId) } : {}),
  };
}

export class ServicioController {
  constructor(
    private readonly crear: CrearServicio,
    private readonly editar: EditarServicio,
    private readonly aceptar: AceptarServicio,
    private readonly cancelar: CancelarServicio,
    private readonly obtener: ObtenerServicio,
    private readonly listarDisponibles: ListarServiciosDisponibles,
    private readonly listarGestor: ListarServiciosDelGestor,
    private readonly listarMisAsignaciones: ListarMisAsignaciones,
    private readonly listarAsignaciones: ListarAsignacionesDeServicio,
  ) {}

  crearHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const raw = CrearServicioSchema.parse(req.body);
      const servicio = await this.crear.execute({
        ...raw,
        fechaInicio: new Date(raw.fechaInicio),
      });
      res.status(201).json(toDTO(servicio));
    } catch (err) {
      next(err);
    }
  };

  editarHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParam.parse(req.params);
      const raw = EditarServicioSchema.parse(req.body);
      const servicio = await this.editar.execute({
        id,
        ...raw,
        fechaInicio: raw.fechaInicio !== undefined ? new Date(raw.fechaInicio) : undefined,
      });
      res.json(toDTO(servicio));
    } catch (err) {
      next(err);
    }
  };

  obtenerHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) throw new UnauthorizedError();
      const { id } = IdParam.parse(req.params);
      const servicio = await this.obtener.execute(id);
      const camareroId = req.usuario.camareroId ?? undefined;
      res.json(toDTO(servicio, camareroId));
    } catch (err) {
      next(err);
    }
  };

  listarGestorHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtro = GestorQuery.parse(req.query);
      const lista = await this.listarGestor.execute(filtro);
      res.json(lista.map((s) => toDTO(s)));
    } catch (err) {
      next(err);
    }
  };

  cancelarHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParam.parse(req.params);
      const servicio = await this.cancelar.execute(id);
      res.json(toDTO(servicio));
    } catch (err) {
      next(err);
    }
  };

  listarDisponiblesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) throw new UnauthorizedError();
      const camareroId = req.usuario.camareroId;
      const lista = await this.listarDisponibles.execute();
      res.json(lista.map((s) => toDTO(s, camareroId ?? undefined)));
    } catch (err) {
      next(err);
    }
  };

  aceptarHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario?.camareroId) {
        throw new ForbiddenError("Solo camareros pueden aceptar servicios");
      }
      const { id } = IdParam.parse(req.params);
      const { asignacion, servicio } = await this.aceptar.execute({
        servicioId: id,
        camareroId: req.usuario.camareroId,
      });
      res.status(201).json({
        asignacion: {
          id: asignacion.id,
          camareroId: asignacion.camareroId,
          servicioId: servicio.id,
          aceptadaEn: asignacion.aceptadaEn.toISOString(),
        },
        servicio: toDTO(servicio, req.usuario.camareroId),
      });
    } catch (err) {
      next(err);
    }
  };

  misAsignacionesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario?.camareroId) {
        throw new ForbiddenError("Solo camareros tienen asignaciones");
      }
      const lista = await this.listarMisAsignaciones.execute(req.usuario.camareroId);
      res.json(lista.map((s) => toDTO(s, req.usuario!.camareroId!)));
    } catch (err) {
      next(err);
    }
  };

  asignacionesDeServicioHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParam.parse(req.params);
      const lista = await this.listarAsignaciones.execute(id);
      const payload: AsignacionConCamareroDTO[] = lista.map((a) => ({
        id: a.id,
        camareroId: a.camareroId,
        nombre: a.nombre,
        email: a.email,
        telefono: a.telefono,
        aceptadaEn: a.aceptadaEn.toISOString(),
      }));
      res.json(payload);
    } catch (err) {
      next(err);
    }
  };
}
