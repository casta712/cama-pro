import type {
  Camarero,
  EstadoCuentaCamarero,
} from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export class ListarCamareros {
  constructor(private readonly camareros: CamareroRepository) {}

  async execute(filtro?: {
    estado?: EstadoCuentaCamarero;
  }): Promise<Camarero[]> {
    return this.camareros.listar(filtro);
  }
}
