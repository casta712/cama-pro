import { randomUUID } from "node:crypto";
import {
  Servicio,
  type Lugar,
  type TipoEvento,
} from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

export interface CrearServicioInput {
  fechaInicio: Date;
  duracionHoras: number;
  lugar: Lugar;
  tipoEvento: TipoEvento;
  cuposTotales: number;
  uniforme?: string;
  notas?: string;
}

export class CrearServicio {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(input: CrearServicioInput): Promise<Servicio> {
    const servicio = Servicio.crear({
      id: randomUUID(),
      ...input,
    });
    await this.servicios.save(servicio);
    return servicio;
  }
}
