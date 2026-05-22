import type { Usuario } from "../Usuario.js";
import type { Email } from "../value-objects/Email.js";

export interface UsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: Email): Promise<Usuario | null>;
  existeEmail(email: Email): Promise<boolean>;
  save(usuario: Usuario): Promise<void>;
}
