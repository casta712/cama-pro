import { NotFoundError } from "../../../shared/errors/AppError.js";
import {
  CredencialesInvalidasError,
  PasswordDebilError,
  PasswordIgualALaActualError,
} from "../domain/errors/IdentityErrors.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";
import type { PasswordHasher } from "../domain/ports/PasswordHasher.js";

export interface CambiarPasswordInput {
  usuarioId: string;
  passwordActual: string;
  passwordNueva: string;
}

const MIN_PASSWORD_LEN = 8;

export class CambiarPassword {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: CambiarPasswordInput): Promise<void> {
    if (input.passwordNueva.length < MIN_PASSWORD_LEN) {
      throw new PasswordDebilError();
    }

    const usuario = await this.usuarios.findById(input.usuarioId);
    if (!usuario) {
      throw new NotFoundError("Usuario", input.usuarioId);
    }

    const actualOk = await this.hasher.verify(
      input.passwordActual,
      usuario.passwordHash,
    );
    if (!actualOk) {
      throw new CredencialesInvalidasError();
    }

    const nuevaIgualActual = await this.hasher.verify(
      input.passwordNueva,
      usuario.passwordHash,
    );
    if (nuevaIgualActual) {
      throw new PasswordIgualALaActualError();
    }

    const nuevoHash = await this.hasher.hash(input.passwordNueva);
    usuario.cambiarPasswordHash(nuevoHash);
    await this.usuarios.save(usuario);
  }
}
