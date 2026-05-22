import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/** Vista del CAMARERO: servicios donde el camarero ya tiene asignacion. */
export class ListarMisAsignaciones {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(camareroId: string): Promise<Servicio[]> {
    return this.servicios.listarPorCamarero(camareroId);
  }
}
