import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/**
 * Vista del CAMARERO: servicios que aun puede aceptar (PUBLICADO, futuros)
 * o donde el camarero ya esta asignado (para mostrarlos con flag).
 */
export class ListarServiciosDisponibles {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(): Promise<Servicio[]> {
    return this.servicios.listar({
      estado: "PUBLICADO",
      soloFuturos: true,
    });
  }
}
