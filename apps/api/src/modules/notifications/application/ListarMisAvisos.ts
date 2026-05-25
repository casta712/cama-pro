import type { Notificacion } from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/** Devuelve los avisos del camarero ordenados por creadaEn descendente. */
export class ListarMisAvisos {
  constructor(private readonly avisos: NotificacionRepository) {}

  async execute(camareroId: string, limit = 50): Promise<Notificacion[]> {
    return this.avisos.listarPorCamarero(camareroId, limit);
  }
}
