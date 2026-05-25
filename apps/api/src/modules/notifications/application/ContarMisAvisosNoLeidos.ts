import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/** Contador de no leidos del camarero. Pensado para el badge del header. */
export class ContarMisAvisosNoLeidos {
  constructor(private readonly avisos: NotificacionRepository) {}

  async execute(camareroId: string): Promise<number> {
    return this.avisos.contarNoLeidas(camareroId);
  }
}
