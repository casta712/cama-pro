import { randomUUID } from "node:crypto";
import type {
  NotificadorDeMovimientoAsignacion,
  NotificarLiberacionInput,
  ServicioRef,
} from "../../bookings/index.js";
import { Notificacion } from "../domain/Notificacion.js";
import type { ServicioSnapshot } from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/**
 * Resolver de destinatarios: dado un rol, devuelve los Usuario.id que
 * deben recibir el aviso. Lo implementa identity (cross-context).
 */
export type ListarUsuariosGestorFn = () => Promise<string[]>;

/**
 * Persiste los avisos dirigidos al gestor cuando un camarero abandona su
 * asignacion. Resuelve los destinatarios al vuelo (todos los usuarios con
 * rol GESTOR). Sin atomicidad con la transaccion origen: ver decision en
 * CLAUDE.md, la fuente de verdad sigue siendo el servicio.
 */
export class NotificadorDeMovimientoAsignacionEnDB
  implements NotificadorDeMovimientoAsignacion
{
  constructor(
    private readonly avisos: NotificacionRepository,
    private readonly listarGestorUsuarioIds: ListarUsuariosGestorFn,
  ) {}

  async notificarLiberacion(input: NotificarLiberacionInput): Promise<void> {
    const gestorIds = await this.listarGestorUsuarioIds();
    if (gestorIds.length === 0) return; // sin gestores, nada que enviar

    const snapshot = mapServicio(input.servicio);
    const avisos = gestorIds.map((usuarioId) =>
      Notificacion.crearLiberacion({
        id: randomUUID(),
        usuarioId,
        servicioId: input.servicioId,
        payload: {
          servicio: snapshot,
          camarero: {
            id: input.camareroId,
            nombre: input.camareroNombre,
          },
        },
      }),
    );
    await this.avisos.saveMany(avisos);
  }
}

function mapServicio(ref: ServicioRef): ServicioSnapshot {
  return {
    lugar: ref.lugar,
    fechaInicio: ref.fechaInicio.toISOString(),
    duracionHoras: ref.duracionHoras,
  };
}
