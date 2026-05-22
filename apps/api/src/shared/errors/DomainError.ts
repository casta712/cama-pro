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

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
