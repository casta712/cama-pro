/**
 * Errores tecnicos (no de dominio): config invalida, IO, dependencias caidas.
 * No representan reglas de negocio.
 */
export class AppError extends Error {
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.cause = cause;
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string, id: string) {
    super(`${recurso} no encontrado: ${id}`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ConflictoConcurrenciaError extends AppError {
  constructor(message = "Conflicto de concurrencia, reintenta") {
    super(message);
    this.name = "ConflictoConcurrenciaError";
  }
}
