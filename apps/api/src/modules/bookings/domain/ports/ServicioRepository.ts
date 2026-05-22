import type { Servicio, EstadoServicio } from "../Servicio.js";

export interface ListarFiltro {
  estado?: EstadoServicio;
  soloFuturos?: boolean;
  conCupoDisponible?: boolean;
}

export interface ServicioRepository {
  findById(id: string): Promise<Servicio | null>;

  /**
   * Persiste el agregado (insert o update). Si el agregado ya existia
   * en BD, aplica BLOQUEO OPTIMISTA: si la version persistida no coincide
   * con la version del agregado en memoria, lanza ConflictoConcurrenciaError.
   *
   * Las asignaciones nuevas (id no existente en BD) se insertan; las
   * existentes no se tocan (en MVP las asignaciones son append-only).
   */
  save(servicio: Servicio): Promise<void>;

  listar(filtro?: ListarFiltro): Promise<Servicio[]>;

  /** Servicios donde un camarero tiene asignacion. */
  listarPorCamarero(camareroId: string): Promise<Servicio[]>;
}
