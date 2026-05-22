import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Camarero } from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export class ObtenerCamarero {
  constructor(private readonly camareros: CamareroRepository) {}

  async execute(camareroId: string): Promise<Camarero> {
    const camarero = await this.camareros.findById(camareroId);
    if (!camarero) {
      throw new NotFoundError("Camarero", camareroId);
    }
    return camarero;
  }
}
