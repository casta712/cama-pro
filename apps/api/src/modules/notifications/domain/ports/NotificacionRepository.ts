import type { Notificacion } from "../Notificacion.js";

export interface NotificacionRepository {
  findById(id: string): Promise<Notificacion | null>;
  /**
   * Lista las notificaciones del usuario ordenadas por creadaEn desc.
   * Limit es opcional; sin limit devuelve todas (en MVP el volumen es pequeño).
   */
  listarPorUsuario(
    usuarioId: string,
    limit?: number,
  ): Promise<Notificacion[]>;
  contarNoLeidas(usuarioId: string): Promise<number>;
  save(notificacion: Notificacion): Promise<void>;
  /** Inserta varias notificaciones de golpe. Usado por los notificadores cross-context. */
  saveMany(notificaciones: ReadonlyArray<Notificacion>): Promise<void>;
  /** Marca como leidas todas las del usuario que sigan sin leer. */
  marcarTodasLeidas(usuarioId: string, ahora: Date): Promise<void>;
}
