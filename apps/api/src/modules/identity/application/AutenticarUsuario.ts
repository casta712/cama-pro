import {
  CredencialesInvalidasError,
  EmailInvalidoError,
} from "../domain/errors/IdentityErrors.js";
import { Email } from "../domain/value-objects/Email.js";
import type { Rol } from "../domain/Usuario.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";
import type { PasswordHasher } from "../domain/ports/PasswordHasher.js";
import type { TokenService } from "../domain/ports/TokenService.js";

export interface AutenticarUsuarioInput {
  email: string;
  password: string;
}

export interface AutenticarUsuarioOutput {
  token: string;
  usuario: {
    id: string;
    email: string;
    rol: Rol;
    camareroId: string | null;
  };
}

export class AutenticarUsuario {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(
    input: AutenticarUsuarioInput,
  ): Promise<AutenticarUsuarioOutput> {
    let email: Email;
    try {
      email = Email.of(input.email);
    } catch (err) {
      // No filtramos a la UI si el email tenia mal formato vs. si no existe.
      if (err instanceof EmailInvalidoError) {
        throw new CredencialesInvalidasError();
      }
      throw err;
    }

    const usuario = await this.usuarios.findByEmail(email);
    if (!usuario) {
      throw new CredencialesInvalidasError();
    }

    const ok = await this.hasher.verify(input.password, usuario.passwordHash);
    if (!ok) {
      throw new CredencialesInvalidasError();
    }

    const token = this.tokens.sign({
      sub: usuario.id,
      rol: usuario.rol,
      camareroId: usuario.camareroId,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email.value,
        rol: usuario.rol,
        camareroId: usuario.camareroId,
      },
    };
  }
}
