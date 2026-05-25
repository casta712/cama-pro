import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Camarero } from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export interface EditarMiPerfilCamareroInput {
  camareroId: string;
  cambios: {
    nombre?: string;
    telefono?: string;
    bio?: string;
  };
}

/**
 * El propio camarero edita sus datos mutables (nombre, telefono, bio).
 * Email y estadoCuenta NO son editables aqui — el primero porque vive
 * duplicado en el agregado Usuario y el segundo porque solo lo mueve el
 * gestor.
 */
export class EditarMiPerfilCamarero {
  constructor(private readonly camareros: CamareroRepository) {}

  async execute(input: EditarMiPerfilCamareroInput): Promise<Camarero> {
    const camarero = await this.camareros.findById(input.camareroId);
    if (!camarero) {
      throw new NotFoundError("Camarero", input.camareroId);
    }
    camarero.editarPerfil(input.cambios);
    await this.camareros.save(camarero);
    return camarero;
  }
}
