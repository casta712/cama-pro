import { DomainError } from "../../../../shared/errors/DomainError.js";

export class AvisoYaLeidoError extends DomainError {
  readonly code = "AVISO_YA_LEIDO";
  override readonly httpStatus = 409;
  constructor() {
    super("El aviso ya estaba marcado como leido");
  }
}
