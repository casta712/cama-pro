import { randomUUID } from "node:crypto";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { CamareroNoActivoError } from "../domain/errors/BookingsErrors.js";
import type { Asignacion, Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/**
 * Dependencia cross-context: consulta al modulo staff para saber si el
 * camarero esta ACTIVO. Recibida como funcion para no acoplar bookings
 * a staff (ver CLAUDE.md seccion 1.2).
 */
export type VerificarCamareroFn = (camareroId: string) => Promise<{
  puedeAceptarServicios: boolean;
}>;

export interface AceptarServicioInput {
  servicioId: string;
  camareroId: string;
}

export interface AceptarServicioOutput {
  asignacion: Asignacion;
  servicio: Servicio;
}

/**
 * Caso de uso CRITICO para concurrencia.
 *
 * Flujo:
 *  1. Verifica que el camarero pueda aceptar (ACTIVO).
 *  2. Carga el Servicio (con su version actual).
 *  3. Llama a Servicio.aceptar() — valida invariantes en el agregado.
 *  4. Persiste con BLOQUEO OPTIMISTA en el repositorio. Si dos camareros
 *     intentan aceptar el ultimo cupo a la vez, solo uno persiste; el otro
 *     recibe ConflictoConcurrenciaError -> 409. El cliente puede reintentar.
 */
export class AceptarServicio {
  constructor(
    private readonly servicios: ServicioRepository,
    private readonly verificarCamarero: VerificarCamareroFn,
  ) {}

  async execute(input: AceptarServicioInput): Promise<AceptarServicioOutput> {
    const info = await this.verificarCamarero(input.camareroId);
    if (!info.puedeAceptarServicios) {
      throw new CamareroNoActivoError();
    }

    const servicio = await this.servicios.findById(input.servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", input.servicioId);
    }

    const asignacion = servicio.aceptar({
      camareroId: input.camareroId,
      asignacionId: randomUUID(),
    });

    await this.servicios.save(servicio);

    return { asignacion, servicio };
  }
}
