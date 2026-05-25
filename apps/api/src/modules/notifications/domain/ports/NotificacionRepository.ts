import type { Notificacion } from "../Notificacion.js";

export interface NotificacionRepository {
  findById(id: string): Promise<Notificacion | null>;
  /**
   * Lista las notificaciones del camarero ordenadas por creadaEn desc.
   * Limit es opcional; sin limit devuelve todas (en MVP el volumen es pequeño).
   */
  listarPorCamarero(
    camareroId: string,
    limit?: number,
  ): Promise<Notificacion[]>;
  contarNoLeidas(camareroId: string): Promise<number>;
  save(notificacion: Notificacion): Promise<void>;
  /** Inserta varias notificaciones de golpe. Usado por el notificador cross-context. */
  saveMany(notificaciones: ReadonlyArray<Notificacion>): Promise<void>;
  /** Marca como leidas todas las del camarero que sigan sin leer. */
  marcarTodasLeidas(camareroId: string, ahora: Date): Promise<void>;
}
