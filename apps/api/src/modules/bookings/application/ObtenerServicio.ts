import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/** Lectura puntual de un Servicio por id. */
export class ObtenerServicio {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(servicioId: string): Promise<Servicio> {
    const servicio = await this.servicios.findById(servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", servicioId);
    }
    return servicio;
  }
}
