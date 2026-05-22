import { randomUUID } from "node:crypto";
import { Usuario, type Rol } from "../domain/Usuario.js";
import { Email } from "../domain/value-objects/Email.js";
import {
  EmailYaRegistradoError,
  PasswordDebilError,
} from "../domain/errors/IdentityErrors.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";
import type { PasswordHasher } from "../domain/ports/PasswordHasher.js";

export interface CrearUsuarioInput {
  email: string;
  password: string;
  rol: Rol;
  camareroId?: string;
}

const MIN_PASSWORD_LEN = 8;

export class CrearUsuario {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: CrearUsuarioInput): Promise<Usuario> {
    if (input.password.length < MIN_PASSWORD_LEN) {
      throw new PasswordDebilError();
    }

    const email = Email.of(input.email);

    if (await this.usuarios.existeEmail(email)) {
      throw new EmailYaRegistradoError(email.value);
    }

    const passwordHash = await this.hasher.hash(input.password);
    const usuario = Usuario.crear({
      id: randomUUID(),
      email,
      passwordHash,
      rol: input.rol,
      camareroId: input.camareroId,
    });

    await this.usuarios.save(usuario);
    return usuario;
  }
}
