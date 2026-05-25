import { Email } from "./value-objects/Email.js";
import { RolUsuarioIncoherenteError } from "./errors/IdentityErrors.js";

export type Rol = "GESTOR" | "CAMARERO";

interface UsuarioProps {
  id: string;
  email: Email;
  passwordHash: string;
  rol: Rol;
  camareroId: string | null;
  creadoEn: Date;
}

/**
 * Agregado Usuario (contexto identity).
 * Invariantes:
 *  - rol=CAMARERO  => camareroId no nulo
 *  - rol=GESTOR    => camareroId nulo
 */
export class Usuario {
  private constructor(private readonly props: UsuarioProps) {}

  static crear(input: {
    id: string;
    email: Email;
    passwordHash: string;
    rol: Rol;
    camareroId?: string;
  }): Usuario {
    if (input.rol === "CAMARERO" && !input.camareroId) {
      throw new RolUsuarioIncoherenteError(
        "Un Usuario con rol CAMARERO requiere camareroId",
      );
    }
    if (input.rol === "GESTOR" && input.camareroId) {
      throw new RolUsuarioIncoherenteError(
        "Un Usuario con rol GESTOR no puede tener camareroId",
      );
    }
    return new Usuario({
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      rol: input.rol,
      camareroId: input.camareroId ?? null,
      creadoEn: new Date(),
    });
  }

  static reconstituir(props: UsuarioProps): Usuario {
    return new Usuario(props);
  }

  /**
   * Sustituye el hash de la contrasena. El caso de uso debe haber:
   *  1. Verificado la contrasena actual contra `passwordHash`.
   *  2. Comprobado que la nueva no coincide con la actual (via hasher.verify).
   *  3. Validado la fortaleza de la nueva contrasena.
   *  4. Producido el nuevo hash con el `PasswordHasher`.
   * Comparar hashes aqui no protege contra "misma contrasena" porque bcrypt
   * usa salt: el mismo input genera hashes distintos.
   */
  cambiarPasswordHash(nuevoHash: string): void {
    this.props.passwordHash = nuevoHash;
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get rol(): Rol {
    return this.props.rol;
  }
  get camareroId(): string | null {
    return this.props.camareroId;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }
}
