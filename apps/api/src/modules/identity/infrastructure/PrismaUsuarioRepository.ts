import type { PrismaClient } from "@prisma/client";
import { Usuario, type Rol } from "../domain/Usuario.js";
import { Email } from "../domain/value-objects/Email.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";

type UsuarioRow = {
  id: string;
  email: string;
  passwordHash: string;
  rol: "GESTOR" | "CAMARERO";
  camareroId: string | null;
  creadoEn: Date;
};

export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Usuario | null> {
    const row = await this.prisma.usuario.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<Usuario | null> {
    const row = await this.prisma.usuario.findUnique({
      where: { email: email.value },
    });
    return row ? this.toDomain(row) : null;
  }

  async existeEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.usuario.count({
      where: { email: email.value },
    });
    return count > 0;
  }

  async save(usuario: Usuario): Promise<void> {
    await this.prisma.usuario.upsert({
      where: { id: usuario.id },
      create: {
        id: usuario.id,
        email: usuario.email.value,
        passwordHash: usuario.passwordHash,
        rol: usuario.rol,
        camareroId: usuario.camareroId,
        creadoEn: usuario.creadoEn,
      },
      update: {
        passwordHash: usuario.passwordHash,
        rol: usuario.rol,
        camareroId: usuario.camareroId,
      },
    });
  }

  async listarIdsPorRol(rol: Rol): Promise<string[]> {
    const rows = await this.prisma.usuario.findMany({
      where: { rol },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async resolverUsuariosDeCamareros(
    camareroIds: ReadonlyArray<string>,
  ): Promise<Map<string, string>> {
    if (camareroIds.length === 0) return new Map();
    const rows = await this.prisma.usuario.findMany({
      where: { camareroId: { in: [...camareroIds] } },
      select: { id: true, camareroId: true },
    });
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.camareroId) m.set(r.camareroId, r.id);
    }
    return m;
  }

  private toDomain(row: UsuarioRow): Usuario {
    return Usuario.reconstituir({
      id: row.id,
      email: Email.of(row.email),
      passwordHash: row.passwordHash,
      rol: row.rol,
      camareroId: row.camareroId,
      creadoEn: row.creadoEn,
    });
  }
}
