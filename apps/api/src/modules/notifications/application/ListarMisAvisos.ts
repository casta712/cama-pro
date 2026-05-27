import type { Notificacion } from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/** Devuelve los avisos del usuario ordenados por creadaEn descendente. */
export class ListarMisAvisos {
  constructor(private readonly avisos: NotificacionRepository) {}

  async execute(usuarioId: string, limit = 50): Promise<Notificacion[]> {
    return this.avisos.listarPorUsuario(usuarioId, limit);
  }
}
