import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Camarero } from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export class SuspenderCamarero {
  constructor(private readonly camareros: CamareroRepository) {}

  async execute(camareroId: string): Promise<Camarero> {
    const camarero = await this.camareros.findById(camareroId);
    if (!camarero) {
      throw new NotFoundError("Camarero", camareroId);
    }
    camarero.suspender();
    await this.camareros.save(camarero);
    return camarero;
  }
}
