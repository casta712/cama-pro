import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

export class CancelarServicio {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(servicioId: string): Promise<Servicio> {
    const servicio = await this.servicios.findById(servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", servicioId);
    }
    servicio.cancelar();
    await this.servicios.save(servicio);
    return servicio;
  }
}
