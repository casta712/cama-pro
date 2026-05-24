import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";

/**
 * Dependencia cross-context: bookings necesita los datos de contacto
 * de los camareros asignados a un servicio (nombre, telefono, email) para
 * que el gestor pueda contactarlos. Se inyecta como funcion para no acoplar
 * bookings con los internals de staff (ver CLAUDE.md seccion 1.2).
 */
export type ObtenerCamarerosContactoFn = (
  ids: ReadonlyArray<string>,
) => Promise<
  Array<{
    id: string;
    nombre: string;
    email: string;
    telefono: string;
  }>
>;

export interface AsignacionConCamarero {
  id: string;
  camareroId: string;
  nombre: string;
  email: string;
  telefono: string;
  aceptadaEn: Date;
}

export class ListarAsignacionesDeServicio {
  constructor(
    private readonly servicios: ServicioRepository,
    private readonly obtenerContactos: ObtenerCamarerosContactoFn,
  ) {}

  async execute(servicioId: string): Promise<AsignacionConCamarero[]> {
    const servicio = await this.servicios.findById(servicioId);
    if (!servicio) {
      throw new NotFoundError("Servicio", servicioId);
    }

    const asignaciones = servicio.asignaciones;
    if (asignaciones.length === 0) return [];

    const camareros = await this.obtenerContactos(
      asignaciones.map((a) => a.camareroId),
    );
    const indice = new Map(camareros.map((c) => [c.id, c]));

    return asignaciones.map((a) => {
      const c = indice.get(a.camareroId);
      return {
        id: a.id,
        camareroId: a.camareroId,
        // Defensivo: si el camarero fue borrado de staff, mostramos
        // "Camarero eliminado" en lugar de romper.
        nombre: c?.nombre ?? "Camarero eliminado",
        email: c?.email ?? "",
        telefono: c?.telefono ?? "",
        aceptadaEn: a.aceptadaEn,
      };
    });
  }
}
