import type { PrismaClient } from "@prisma/client";
import { Usuario } from "../domain/Usuario.js";
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
