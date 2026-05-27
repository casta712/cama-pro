import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type { NotificadorDeMovimientoAsignacion } from "../domain/ports/NotificadorDeMovimientoAsignacion.js";
import type { ObtenerCamarerosContactoFn } from "./ListarAsignacionesDeServicio.js";

export interface LiberarAsignacionInput {
  servicioId: string;
  camareroId: string;
}

export interface LiberarAsignacionOutput {
  servicio: Servicio;
  asignacionId: string;
  volvioAPublicado: boolean;
}

/**
 * El camarero libera (abandona) una asignacion previamente aceptada.
 *
 * Flujo:
 *  1. Carga el servicio.
 *  2. Pide al agregado liberar (valida invariantes: estado, antelacion,
 *     pertenencia de la asignacion).
 *  3. Persiste (bloqueo optimista + delete de la asignacion).
 *  4. Notifica al gestor (en transaccion separada, tolerante a fallo:
 *     mismo trade-off documentado en CancelarServicio/EditarServicio).
 */
export class LiberarAsignacion {
  constructor(
    private readonly servicios: ServicioRepository,
    private readonly notificador: NotificadorDeMovimientoAsignacion,
    private readonly obtenerContactos: ObtenerCamarerosContactoFn,
  ) {}

  async execute(input: LiberarAsignacionInput): Promise<LiberarAsignacionOutput> {
    const servicio = await this.servicios.findById(input.servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", input.servicioId);
    }

    const { asignacionId, volvioAPublicado } = servicio.liberarPorCamarero(
      input.camareroId,
    );

    await this.servicios.save(servicio);

    try {
      const contactos = await this.obtenerContactos([input.camareroId]);
      const nombre = contactos[0]?.nombre ?? "Camarero";
      await this.notificador.notificarLiberacion({
        servicioId: servicio.id,
        servicio: {
          lugar: servicio.lugar.nombre,
          fechaInicio: servicio.fechaInicio,
          duracionHoras: servicio.duracionHoras,
        },
        camareroId: input.camareroId,
        camareroNombre: nombre,
      });
    } catch (err) {
      // No abortamos la liberacion si el aviso falla: la fuente de verdad
      // sigue siendo el servicio (al recargar el gestor ve menos cupos).
      console.error("[LiberarAsignacion] fallo notificando al gestor:", err);
    }

    return { servicio, asignacionId, volvioAPublicado };
  }
}
