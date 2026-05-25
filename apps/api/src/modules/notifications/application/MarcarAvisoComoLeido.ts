import {
  ForbiddenError,
  NotFoundError,
} from "../../../shared/errors/AppError.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

export interface MarcarAvisoComoLeidoInput {
  camareroId: string;
  avisoId: string;
}

/**
 * Marca un aviso como leido. Idempotente: si ya estaba leido, no hace nada.
 * Valida que el aviso pertenezca al camarero que pide la accion para no
 * filtrar avisos ajenos.
 */
export class MarcarAvisoComoLeido {
  constructor(private readonly avisos: NotificacionRepository) {}

  async execute(input: MarcarAvisoComoLeidoInput): Promise<void> {
    const aviso = await this.avisos.findById(input.avisoId);
    if (!aviso) {
      throw new NotFoundError("Aviso", input.avisoId);
    }
    if (aviso.camareroId !== input.camareroId) {
      throw new ForbiddenError("El aviso no pertenece al usuario actual");
    }
    if (aviso.estaLeida) return; // idempotente, evita escritura innecesaria

    aviso.marcarLeida();
    await this.avisos.save(aviso);
  }
}
