import type { Servicio, EstadoServicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/** Vista del GESTOR: todos los servicios, con filtro opcional por estado. */
export class ListarServiciosDelGestor {
  constructor(private readonly servicios: ServicioRepository) {}

  async execute(filtro?: { estado?: EstadoServicio }): Promise<Servicio[]> {
    return this.servicios.listar({ estado: filtro?.estado });
  }
}
