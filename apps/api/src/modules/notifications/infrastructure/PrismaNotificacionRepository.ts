import type { PrismaClient, Prisma } from "@prisma/client";
import {
  Notificacion,
  type PayloadNotificacion,
  type TipoNotificacion,
} from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";

type NotificacionRow = {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  servicioId: string;
  payload: Prisma.JsonValue;
  leidaEn: Date | null;
  creadaEn: Date;
};

export class PrismaNotificacionRepository implements NotificacionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Notificacion | null> {
    const row = await this.prisma.notificacion.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listarPorUsuario(
    usuarioId: string,
    limit?: number,
  ): Promise<Notificacion[]> {
    const rows = await this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { creadaEn: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async contarNoLeidas(usuarioId: string): Promise<number> {
    return this.prisma.notificacion.count({
      where: { usuarioId, leidaEn: null },
    });
  }

  async save(notificacion: Notificacion): Promise<void> {
    await this.prisma.notificacion.upsert({
      where: { id: notificacion.id },
      create: this.toRow(notificacion),
      update: { leidaEn: notificacion.leidaEn },
    });
  }

  async saveMany(
    notificaciones: ReadonlyArray<Notificacion>,
  ): Promise<void> {
    if (notificaciones.length === 0) return;
    await this.prisma.notificacion.createMany({
      data: notificaciones.map((n) => this.toRow(n)),
    });
  }

  async marcarTodasLeidas(usuarioId: string, ahora: Date): Promise<void> {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leidaEn: null },
      data: { leidaEn: ahora },
    });
  }

  private toRow(n: Notificacion) {
    return {
      id: n.id,
      usuarioId: n.usuarioId,
      tipo: n.tipo,
      servicioId: n.servicioId,
      payload: n.payload as unknown as Prisma.InputJsonValue,
      leidaEn: n.leidaEn,
      creadaEn: n.creadaEn,
    };
  }

  private toDomain(row: NotificacionRow): Notificacion {
    return Notificacion.reconstituir({
      id: row.id,
      usuarioId: row.usuarioId,
      tipo: row.tipo,
      servicioId: row.servicioId,
      payload: row.payload as unknown as PayloadNotificacion,
      leidaEn: row.leidaEn,
      creadaEn: row.creadaEn,
    });
  }
}
