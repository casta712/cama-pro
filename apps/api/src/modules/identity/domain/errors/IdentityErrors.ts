import { DomainError } from "../../../../shared/errors/DomainError.js";

export class EmailInvalidoError extends DomainError {
  readonly code = "EMAIL_INVALIDO";
  constructor(email: string) {
    super(`Email invalido: ${email}`);
  }
}

export class EmailYaRegistradoError extends DomainError {
  readonly code = "EMAIL_YA_REGISTRADO";
  constructor(email: string) {
    super(`El email ${email} ya esta registrado`);
  }
}

export class CredencialesInvalidasError extends DomainError {
  readonly code = "CREDENCIALES_INVALIDAS";
  override readonly httpStatus = 401;
  constructor() {
    super("Credenciales invalidas");
  }
}

export class PasswordDebilError extends DomainError {
  readonly code = "PASSWORD_DEBIL";
  constructor() {
    super("La password debe tener al menos 8 caracteres");
  }
}

export class PasswordIgualALaActualError extends DomainError {
  readonly code = "PASSWORD_IGUAL_A_LA_ACTUAL";
  override readonly httpStatus = 422;
  constructor() {
    super("La nueva contrasena no puede ser igual a la actual");
  }
}

export class RolUsuarioIncoherenteError extends DomainError {
  readonly code = "ROL_INCOHERENTE";
  constructor(message: string) {
    super(message);
  }
}
