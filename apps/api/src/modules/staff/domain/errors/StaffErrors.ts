import { DomainError } from "../../../../shared/errors/DomainError.js";

export class NombreInvalidoError extends DomainError {
  readonly code = "NOMBRE_INVALIDO";
  override readonly httpStatus = 400;
  constructor() {
    super("El nombre debe tener entre 2 y 80 caracteres");
  }
}

export class TelefonoInvalidoError extends DomainError {
  readonly code = "TELEFONO_INVALIDO";
  override readonly httpStatus = 400;
  constructor() {
    super("El telefono debe tener entre 6 y 20 caracteres");
  }
}

export class EmailCamareroYaRegistradoError extends DomainError {
  readonly code = "EMAIL_CAMARERO_YA_REGISTRADO";
  constructor(email: string) {
    super(`Ya existe un camarero con el email ${email}`);
  }
}

export class CamareroNoActivoError extends DomainError {
  readonly code = "CAMARERO_NO_ACTIVO";
  override readonly httpStatus = 403;
  constructor() {
    super("El camarero no esta activo");
  }
}
