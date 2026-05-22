import type { Request, Response, NextFunction } from "express";
import {
  RegistrarCamareroInput,
  ListarCamarerosQuery,
  type CamareroDTO,
} from "@cama-pro/shared-types";
import { z } from "zod";
import type { Camarero } from "../domain/Camarero.js";
import type { RegistrarCamarero } from "../application/RegistrarCamarero.js";
import type { AprobarCamarero } from "../application/AprobarCamarero.js";
import type { SuspenderCamarero } from "../application/SuspenderCamarero.js";
import type { ListarCamareros } from "../application/ListarCamareros.js";

const IdParam = z.object({ id: z.string().uuid() });

function toDTO(c: Camarero): CamareroDTO {
  return {
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    estadoCuenta: c.estadoCuenta,
    creadoEn: c.creadoEn.toISOString(),
  };
}

export class CamareroController {
  constructor(
    private readonly registrar: RegistrarCamarero,
    private readonly aprobar: AprobarCamarero,
    private readonly suspender: SuspenderCamarero,
    private readonly listar: ListarCamareros,
  ) {}

  registro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = RegistrarCamareroInput.parse(req.body);
      const camarero = await this.registrar.execute(input);
      res.status(201).json(toDTO(camarero));
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtro = ListarCamarerosQuery.parse(req.query);
      const camareros = await this.listar.execute(filtro);
      res.json(camareros.map(toDTO));
    } catch (err) {
      next(err);
    }
  };

  aprobarHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParam.parse(req.params);
      const camarero = await this.aprobar.execute(id);
      res.json(toDTO(camarero));
    } catch (err) {
      next(err);
    }
  };

  suspenderHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = IdParam.parse(req.params);
      const camarero = await this.suspender.execute(id);
      res.json(toDTO(camarero));
    } catch (err) {
      next(err);
    }
  };
}
