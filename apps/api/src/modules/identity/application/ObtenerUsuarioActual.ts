import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Usuario } from "../domain/Usuario.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";

export class ObtenerUsuarioActual {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async execute(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarios.findById(usuarioId);
    if (!usuario) {
      throw new NotFoundError("Usuario", usuarioId);
    }
    return usuario;
  }
}
