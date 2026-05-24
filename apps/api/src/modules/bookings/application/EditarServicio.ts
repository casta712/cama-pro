import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Lugar, Servicio, TipoEvento } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

export interface EditarServicioInput {
  id: string;
  fechaInicio?: Date;
  duracionHoras?: number;
  lugar?: Lugar;
  tipoEvento?: TipoEvento;
  cuposTotales?: number;
  uniforme?: string | null;
  notas?: string | null;
}

export class EditarServicio {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(input: EditarServicioInput): Promise<Servicio> {
    const servicio = await this.servicios.findById(input.id);
    if (!servicio) {
      throw new NotFoundError("Servicio", input.id);
    }
    const { id: _omit, ...cambios } = input;
    servicio.editar(cambios);
    await this.servicios.save(servicio);
    return servicio;
  }
}
