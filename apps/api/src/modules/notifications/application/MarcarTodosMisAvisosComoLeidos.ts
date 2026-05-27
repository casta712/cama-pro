import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/**
 * Marca como leidos todos los avisos del usuario. Una sola query masiva
 * en el repo en vez de cargar y guardar uno por uno, porque el agregado
 * Notificacion no tiene invariantes que validar al marcar leida.
 */
export class MarcarTodosMisAvisosComoLeidos {
  constructor(private readonly avisos: NotificacionRepository) {}

  async execute(usuarioId: string): Promise<void> {
    await this.avisos.marcarTodasLeidas(usuarioId, new Date());
  }
}
