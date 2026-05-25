import { NotFoundError } from "../../../shared/errors/AppError.js";
import type { Lugar, Servicio, TipoEvento } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type {
  CambiosBlandos,
  NotificadorDeCambioServicio,
} from "../domain/ports/NotificadorDeCambioServicio.js";

export interface EditarServicioInput {
  id: string;
  fechaInicio?: Date;
  duracionHoras?: number;
  lugar?: Lugar;
  tipoEvento?: TipoEvento;
  cuposTotales?: number;
  uniforme?: string | null;
  notas?: string | null;
}

interface SnapshotBlando {
  tipoEvento: TipoEvento;
  uniforme: string | null;
  notas: string | null;
}

export class EditarServicio {
  constructor(
    private readonly servicios: ServicioRepository,
    private readonly notificador: NotificadorDeCambioServicio,
  ) {}

  async execute(input: EditarServicioInput): Promise<Servicio> {
    const servicio = await this.servicios.findById(input.id);
    if (!servicio) {
      throw new NotFoundError("Servicio", input.id);
    }

    const camareroIds = servicio.asignaciones.map((a) => a.camareroId);
    const antes: SnapshotBlando = {
      tipoEvento: servicio.tipoEvento,
      uniforme: servicio.uniforme,
      notas: servicio.notas,
    };

    const { id: _omit, ...cambios } = input;
    servicio.editar(cambios);
    await this.servicios.save(servicio);

    if (camareroIds.length > 0) {
      const despues: SnapshotBlando = {
        tipoEvento: servicio.tipoEvento,
        uniforme: servicio.uniforme,
        notas: servicio.notas,
      };
      const delta = construirDelta(antes, despues);
      if (delta !== null) {
        try {
          await this.notificador.notificarEdicion({
            servicioId: servicio.id,
            camareroIds,
            servicio: {
              lugar: servicio.lugar.nombre,
              fechaInicio: servicio.fechaInicio,
              duracionHoras: servicio.duracionHoras,
            },
            cambios: delta,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            `[notificaciones] fallo notificar edicion de servicio ${servicio.id}:`,
            err,
          );
        }
      }
    }

    return servicio;
  }
}

function construirDelta(
  antes: SnapshotBlando,
  despues: SnapshotBlando,
): CambiosBlandos | null {
  const delta: { -readonly [K in keyof CambiosBlandos]: CambiosBlandos[K] } = {};
  if (antes.tipoEvento !== despues.tipoEvento) {
    delta.tipoEvento = { antes: antes.tipoEvento, despues: despues.tipoEvento };
  }
  if (antes.uniforme !== despues.uniforme) {
    delta.uniforme = { antes: antes.uniforme, despues: despues.uniforme };
  }
  if (antes.notas !== despues.notas) {
    delta.notas = { antes: antes.notas, despues: despues.notas };
  }
  return delta.tipoEvento || delta.uniforme || delta.notas ? delta : null;
}
