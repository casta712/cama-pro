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
        const updated = await tx.servicio.updateMany({
          where: { id: servicio.id, version: servicio.version },
          data: {
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

      // Asignaciones append-only en MVP: insertamos solo las nuevas.
      const existentes = await tx.asignacion.findMany({
        where: { servicioId: servicio.id },
        select: { id: true },
      });
      const idsExistentes = new Set(existentes.map((a) => a.id));
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
    });
  }

  async listar(filtro?: ListarFiltro): Promise<Servicio[]> {
    const where: Prisma.ServicioWhereInput = {};
    if (filtro?.estado) {
      where.estado = filtro.estado;
    }
    if (filtro?.soloFuturos) {
      where.fechaInicio = { gt: new Date() };
    }

    const rows = await this.prisma.servicio.findMany({
      where,
      include: { asignaciones: true },
      orderBy: { fechaInicio: "asc" },
    });

    const servicios = rows.map((r) => this.toDomain(r));

    if (filtro?.conCupoDisponible) {
      return servicios.filter((s) => !s.estaCompleto);
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
