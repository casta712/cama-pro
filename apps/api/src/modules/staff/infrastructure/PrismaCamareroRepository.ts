import type { PrismaClient } from "@prisma/client";
import {
  Camarero,
  type EstadoCuentaCamarero,
} from "../domain/Camarero.js";
import type { CamareroRepository } from "../domain/ports/CamareroRepository.js";

type CamareroRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  bio: string;
  estadoCuenta: EstadoCuentaCamarero;
  creadoEn: Date;
};

export class PrismaCamareroRepository implements CamareroRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Camarero | null> {
    const row = await this.prisma.camarero.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<Camarero | null> {
    const row = await this.prisma.camarero.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findManyByIds(ids: ReadonlyArray<string>): Promise<Camarero[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.camarero.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async existeEmail(email: string): Promise<boolean> {
    const count = await this.prisma.camarero.count({ where: { email } });
    return count > 0;
  }

  async save(camarero: Camarero): Promise<void> {
    await this.prisma.camarero.upsert({
      where: { id: camarero.id },
      create: {
        id: camarero.id,
        nombre: camarero.nombre,
        email: camarero.email,
        telefono: camarero.telefono,
        bio: camarero.bio,
        estadoCuenta: camarero.estadoCuenta,
        creadoEn: camarero.creadoEn,
      },
      update: {
        nombre: camarero.nombre,
        telefono: camarero.telefono,
        bio: camarero.bio,
        estadoCuenta: camarero.estadoCuenta,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.camarero.delete({ where: { id } });
  }

  async listar(filtro?: {
    estado?: EstadoCuentaCamarero;
  }): Promise<Camarero[]> {
    const rows = await this.prisma.camarero.findMany({
      where: filtro?.estado ? { estadoCuenta: filtro.estado } : undefined,
      orderBy: { creadoEn: "desc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: CamareroRow): Camarero {
    return Camarero.reconstituir({
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      bio: row.bio,
      estadoCuenta: row.estadoCuenta,
      creadoEn: row.creadoEn,
    });
  }
}
