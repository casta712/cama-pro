import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Camarero } from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export class AprobarCamarero {
  constructor(private readonly camareros: CamareroRepository) {}

  async execute(camareroId: string): Promise<Camarero> {
    const camarero = await this.camareros.findById(camareroId);
    if (!camarero) {
      throw new NotFoundError("Camarero", camareroId);
    }
    camarero.aprobar();
    await this.camareros.save(camarero);
    return camarero;
  }
}
