import type { PrismaClient, Prisma } from "@prisma/client";
import { ConflictoConcurrenciaError } from "../../../shared/errors/AppError.js";
import {
  Servicio,
  type Asignacion,
  type EstadoServicio,
  type TipoEvento,
} from "../domain/Servicio.js";
import type {
  ListarFiltro,
  ServicioRepository,
} from "../domain/ports/ServicioRepository.js";

type ServicioRow = {
  id: string;
  fechaInicio: Date;
  duracionHoras: number;
  lugarNombre: string;
  lugarDireccion: string;
  tipoEvento: TipoEvento;
  cuposTotales: number;
  uniforme: string | null;
  notas: string | null;
  estado: EstadoServicio;
  version: number;
  creadoEn: Date;
  asignaciones: AsignacionRow[];
};

type AsignacionRow = {
  id: string;
  servicioId: string;
  camareroId: string;
  aceptadaEn: Date;
};

export class PrismaServicioRepository implements ServicioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Servicio | null> {
    const row = await this.prisma.servicio.findUnique({
      where: { id },
      include: { asignaciones: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(servicio: Servicio): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existe = await tx.servicio.findUnique({
        where: { id: servicio.id },
        select: { version: true },
      });

      if (!existe) {
        await tx.servicio.create({
          data: {
            id: servicio.id,
            fechaInicio: servicio.fechaInicio,
            duracionHoras: servicio.duracionHoras,
            lugarNombre: servicio.lugar.nombre,
            lugarDireccion: servicio.lugar.direccion,
            tipoEvento: servicio.tipoEvento,
            cuposTotales: servicio.cuposTotales,
            uniforme: servicio.uniforme,
            notas: servicio.notas,
            estado: servicio.estado,
            version: servicio.version,
            creadoEn: servicio.creadoEn,
          },
        });
      } else {
        // BLOQUEO OPTIMISTA: solo actualiza si la version en BD sigue
        // siendo la misma que cuando se cargo el agregado en memoria.
        // Persistimos todos los campos mutables (no solo estado) para que
        // los casos de uso de edicion vean los cambios reflejados en BD.
        const updated = await tx.servicio.updateMany({
          where: { id: servicio.id, version: servicio.version },
          data: {
            fechaInicio: servicio.fechaInicio,
            duracionHoras: servicio.duracionHoras,
            lugarNombre: servicio.lugar.nombre,
            lugarDireccion: servicio.lugar.direccion,
            tipoEvento: servicio.tipoEvento,
            cuposTotales: servicio.cuposTotales,
            uniforme: servicio.uniforme,
            notas: servicio.notas,
            estado: servicio.estado,
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new ConflictoConcurrenciaError(
            "El servicio fue modificado por otra operacion, reintenta",
          );
        }
      }

      // Reconciliacion de asignaciones: insertamos las nuevas y borramos
      // las que ya no estan en el agregado en memoria (caso liberar).
      // El bloqueo optimista de mas arriba garantiza que no nos pisamos
      // con otra operacion concurrente sobre el mismo servicio.
      const existentes = await tx.asignacion.findMany({
        where: { servicioId: servicio.id },
        select: { id: true },
      });
      const idsExistentes = new Set(existentes.map((a) => a.id));
      const idsEnMemoria = new Set(servicio.asignaciones.map((a) => a.id));

      const nuevas = servicio.asignaciones.filter(
        (a) => !idsExistentes.has(a.id),
      );
      if (nuevas.length > 0) {
        await tx.asignacion.createMany({
          data: nuevas.map((a) => ({
            id: a.id,
            servicioId: servicio.id,
            camareroId: a.camareroId,
            aceptadaEn: a.aceptadaEn,
          })),
        });
      }

      const aBorrar = [...idsExistentes].filter((id) => !idsEnMemoria.has(id));
      if (aBorrar.length > 0) {
        await tx.asignacion.deleteMany({
          where: { id: { in: aBorrar } },
        });
      }
    });
  }

  async listar(filtro?: ListarFiltro): Promise<Servicio[]> {
    // El filtro por estado NO se aplica en SQL: EN_CURSO y FINALIZADO (por
    // tiempo) se computan al vuelo en Servicio.estadoActual() y nunca se
    // persisten. Filtramos en memoria tras reconstituir el agregado.
    const where: Prisma.ServicioWhereInput = {};
    if (filtro?.soloFuturos) {
      where.fechaInicio = { gt: new Date() };
    }

    const rows = await this.prisma.servicio.findMany({
      where,
      include: { asignaciones: true },
      orderBy: { fechaInicio: "asc" },
    });

    let servicios = rows.map((r) => this.toDomain(r));

    if (filtro?.estado) {
      const estado = filtro.estado;
      servicios = servicios.filter((s) => s.estadoActual() === estado);
    }
    if (filtro?.conCupoDisponible) {
      servicios = servicios.filter((s) => !s.estaCompleto);
    }
    return servicios;
  }

  async listarPorCamarero(camareroId: string): Promise<Servicio[]> {
    const rows = await this.prisma.servicio.findMany({
      where: { asignaciones: { some: { camareroId } } },
      include: { asignaciones: true },
      orderBy: { fechaInicio: "asc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: ServicioRow): Servicio {
    const asignaciones: Asignacion[] = row.asignaciones.map((a) => ({
      id: a.id,
      camareroId: a.camareroId,
      aceptadaEn: a.aceptadaEn,
    }));

    return Servicio.reconstituir({
      id: row.id,
      fechaInicio: row.fechaInicio,
      duracionHoras: row.duracionHoras,
      lugar: { nombre: row.lugarNombre, direccion: row.lugarDireccion },
      tipoEvento: row.tipoEvento,
      cuposTotales: row.cuposTotales,
      uniforme: row.uniforme,
      notas: row.notas,
      estado: row.estado,
      version: row.version,
      creadoEn: row.creadoEn,
      asignaciones,
    });
  }
}
