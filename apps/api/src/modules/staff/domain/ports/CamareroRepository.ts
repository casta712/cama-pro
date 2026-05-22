import type { Camarero, EstadoCuentaCamarero } from "../Camarero.js";

export interface CamareroRepository {
  findById(id: string): Promise<Camarero | null>;
  findByEmail(email: string): Promise<Camarero | null>;
  existeEmail(email: string): Promise<boolean>;
  save(camarero: Camarero): Promise<void>;
  delete(id: string): Promise<void>;
  listar(filtro?: { estado?: EstadoCuentaCamarero }): Promise<Camarero[]>;
}
