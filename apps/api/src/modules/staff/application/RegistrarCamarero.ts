import { randomUUID } from "node:crypto";
import { Camarero } from "../domain/Camarero.js";
import { EmailCamareroYaRegistradoError } from "../domain/errors/StaffErrors.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

export interface RegistrarCamareroInput {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

/**
 * Dependencia cross-context: como crear un Usuario en identity.
 * Recibida como funcion en lugar de importar el modulo identity directamente,
 * para no acoplar staff a identity (ver CLAUDE.md seccion 1.2).
 */
export type CrearUsuarioCamareroFn = (input: {
  email: string;
  password: string;
  rol: "CAMARERO";
  camareroId: string;
}) => Promise<{ id: string }>;

export class RegistrarCamarero {
  constructor(
    private readonly camareros: CamareroRepository,
    private readonly crearUsuarioCamarero: CrearUsuarioCamareroFn,
  ) {}

  async execute(input: RegistrarCamareroInput): Promise<Camarero> {
    const emailNorm = input.email.trim().toLowerCase();
    if (await this.camareros.existeEmail(emailNorm)) {
      throw new EmailCamareroYaRegistradoError(emailNorm);
    }

    const camarero = Camarero.crear({
      id: randomUUID(),
      nombre: input.nombre,
      email: emailNorm,
      telefono: input.telefono,
    });

    await this.camareros.save(camarero);

    // Compensacion: si la creacion del Usuario falla, rollback manual del Camarero.
    // No usamos transaccion cross-context para no acoplar identity con staff.
    try {
      await this.crearUsuarioCamarero({
        email: emailNorm,
        password: input.password,
        rol: "CAMARERO",
        camareroId: camarero.id,
      });
    } catch (err) {
      await this.camareros.delete(camarero.id);
      throw err;
    }

    return camarero;
  }
}
