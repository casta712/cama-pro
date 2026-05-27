import { randomUUID } from "node:crypto";
import type {
  NotificadorDeCambioServicio,
  NotificarCancelacionInput,
  NotificarEdicionInput,
  ServicioRef,
  CambiosBlandos,
} from "../../bookings/index.js";
import { Notificacion } from "../domain/Notificacion.js";
import type {
  CambiosEdicion,
  ServicioSnapshot,
} from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

/**
 * Resolver cross-context: traduce camareroIds (lo que bookings conoce) a
 * usuarioIds (clave de Notificacion). Lo implementa identity.
 */
export type ResolverUsuariosDeCamarerosFn = (
  camareroIds: ReadonlyArray<string>,
) => Promise<Map<string, string>>;

/**
 * Implementacion del notificador cross-context: persiste las
 * notificaciones en la BD del modulo notifications.
 *
 * Sin atomicidad fuerte con la transaccion que origino el cambio (ver
 * decision en docs y CLAUDE.md: la fuente de verdad para el camarero
 * sigue siendo el servicio, no la notificacion).
 */
export class NotificadorDeCambioServicioEnDB
  implements NotificadorDeCambioServicio
{
  constructor(
    private readonly avisos: NotificacionRepository,
    private readonly resolverUsuarios: ResolverUsuariosDeCamarerosFn,
  ) {}

  async notificarCancelacion(input: NotificarCancelacionInput): Promise<void> {
    if (input.camareroIds.length === 0) return;
    const usuarios = await this.resolverUsuarios(input.camareroIds);
    if (usuarios.size === 0) return; // ningun destinatario resoluble
    const snapshot = mapServicio(input.servicio);
    const avisos: Notificacion[] = [];
    for (const camareroId of input.camareroIds) {
      const usuarioId = usuarios.get(camareroId);
      if (!usuarioId) continue; // camarero sin usuario asociado, se omite
      avisos.push(
        Notificacion.crearCancelacion({
          id: randomUUID(),
          usuarioId,
          servicioId: input.servicioId,
          payload: { servicio: snapshot },
        }),
      );
    }
    await this.avisos.saveMany(avisos);
  }

  async notificarEdicion(input: NotificarEdicionInput): Promise<void> {
    if (input.camareroIds.length === 0) return;
    if (esCambioVacio(input.cambios)) return; // nada que comunicar
    const usuarios = await this.resolverUsuarios(input.camareroIds);
    if (usuarios.size === 0) return;
    const snapshot = mapServicio(input.servicio);
    const cambios = mapCambios(input.cambios);
    const avisos: Notificacion[] = [];
    for (const camareroId of input.camareroIds) {
      const usuarioId = usuarios.get(camareroId);
      if (!usuarioId) continue;
      avisos.push(
        Notificacion.crearEdicion({
          id: randomUUID(),
          usuarioId,
          servicioId: input.servicioId,
          payload: { servicio: snapshot, cambios },
        }),
      );
    }
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

function mapCambios(c: CambiosBlandos): CambiosEdicion {
  const r: { -readonly [K in keyof CambiosEdicion]: CambiosEdicion[K] } = {};
  if (c.tipoEvento) r.tipoEvento = { ...c.tipoEvento };
  if (c.uniforme) r.uniforme = { ...c.uniforme };
  if (c.notas) r.notas = { ...c.notas };
  return r;
}

function esCambioVacio(c: CambiosBlandos): boolean {
  return c.tipoEvento === undefined && c.uniforme === undefined && c.notas === undefined;
}
