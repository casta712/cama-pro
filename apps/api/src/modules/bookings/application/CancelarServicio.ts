import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type { NotificadorDeCambioServicio } from "../domain/ports/NotificadorDeCambioServicio.js";

export class CancelarServicio {
  constructor(
    private readonly servicios: ServicioRepository,
    private readonly notificador: NotificadorDeCambioServicio,
  ) {}

  async execute(servicioId: string): Promise<Servicio> {
    const servicio = await this.servicios.findById(servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", servicioId);
    }
    // Snapshot de los camareros con asignacion ANTES de cancelar; tras
    // cancelar() las asignaciones del agregado siguen ahi pero el estado
    // ya es CANCELADO. Capturarlos aqui es claro y robusto frente a
    // futuros cambios en el agregado.
    const camareroIds = servicio.asignaciones.map((a) => a.camareroId);

    servicio.cancelar();
    await this.servicios.save(servicio);

    // No-atomico: si falla aqui, el servicio queda cancelado y el aviso
    // se pierde. El camarero seguira viendo el estado correcto al
    // refrescar /mis-asignaciones; logueamos para detectarlo.
    try {
      await this.notificador.notificarCancelacion({
        servicioId: servicio.id,
        camareroIds,
        servicio: {
          lugar: servicio.lugar.nombre,
          fechaInicio: servicio.fechaInicio,
          duracionHoras: servicio.duracionHoras,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[notificaciones] fallo notificar cancelacion de servicio ${servicio.id}:`,
        err,
      );
    }

    return servicio;
  }
}
