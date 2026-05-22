/**
 * Error base del dominio. Los errores de dominio representan violaciones
 * de invariantes o transiciones invalidas — son parte del lenguaje del negocio,
 * no fallos tecnicos.
 *
 * Subclases concretas viven dentro de cada modulo:
 *   modules/bookings/domain/errors/CupoLlenoError.ts, etc.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  /**
   * HTTP status sugerido al mapear este error en la capa de presentacion.
   * Default: 409 (conflicto de regla de negocio). Sobrescribir si aplica
   * otro codigo (p.ej. 401 para credenciales).
   */
  readonly httpStatus: number = 409;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
