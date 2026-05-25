import { describe, it, expect } from "vitest";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import {
  CredencialesInvalidasError,
  PasswordDebilError,
  PasswordIgualALaActualError,
} from "../domain/errors/IdentityErrors.js";
import { Email } from "../domain/value-objects/Email.js";
import { Usuario } from "../domain/Usuario.js";
import type { UsuarioRepository } from "../domain/ports/UsuarioRepository.js";
import type { PasswordHasher } from "../domain/ports/PasswordHasher.js";
import { CambiarPassword } from "../application/CambiarPassword.js";

/**
 * Hasher en memoria con "salt" determinista: hash(p) = `H(${p})#${salt}`.
 * Permite verificar exactamente el password original aunque cada hash sea
 * unico (modela la propiedad de bcrypt: mismo input -> hash distinto si la
 * salt cambia, pero verify() devuelve true).
 */
function fakeHasher(): PasswordHasher {
  let saltSeq = 0;
  return {
    hash: async (p) => `H(${p})#${++saltSeq}`,
    verify: async (p, hash) => hash.startsWith(`H(${p})#`),
  };
}

function fakeRepo(usuario: Usuario | null) {
  let saved: Usuario | null = null;
  const repo: UsuarioRepository = {
    findById: async (id) => (usuario && usuario.id === id ? usuario : null),
    findByEmail: async () => null,
    existeEmail: async () => false,
    save: async (u) => {
      saved = u;
    },
  };
  return {
    repo,
    get saved() {
      return saved;
    },
  };
}

async function gestor(hasher: PasswordHasher): Promise<Usuario> {
  return Usuario.crear({
    id: "u1",
    email: Email.of("gestor@cama.es"),
    passwordHash: await hasher.hash("actualOK1"),
    rol: "GESTOR",
  });
}

describe("CambiarPassword", () => {
  it("cambia la contrasena cuando la actual es correcta y la nueva valida", async () => {
    const hasher = fakeHasher();
    const u = await gestor(hasher);
    const hashOriginal = u.passwordHash;
    const { repo, saved } = (() => fakeRepo(u))();
    const sut = new CambiarPassword(repo, hasher);

    await sut.execute({
      usuarioId: "u1",
      passwordActual: "actualOK1",
      passwordNueva: "otraValida9",
    });

    expect(u.passwordHash).not.toBe(hashOriginal);
    expect(await hasher.verify("otraValida9", u.passwordHash)).toBe(true);
    // saved es lazy; recuperamos del repo
    void saved;
  });

  it("lanza CredencialesInvalidasError si la contrasena actual no coincide", async () => {
    const hasher = fakeHasher();
    const u = await gestor(hasher);
    const { repo } = fakeRepo(u);
    const sut = new CambiarPassword(repo, hasher);

    await expect(
      sut.execute({
        usuarioId: "u1",
        passwordActual: "no-es-esa",
        passwordNueva: "otraValida9",
      }),
    ).rejects.toThrow(CredencialesInvalidasError);
  });

  it("lanza PasswordDebilError si la nueva tiene menos de 8 caracteres", async () => {
    const hasher = fakeHasher();
    const u = await gestor(hasher);
    const { repo } = fakeRepo(u);
    const sut = new CambiarPassword(repo, hasher);

    await expect(
      sut.execute({
        usuarioId: "u1",
        passwordActual: "actualOK1",
        passwordNueva: "corta",
      }),
    ).rejects.toThrow(PasswordDebilError);
  });

  it("lanza PasswordIgualALaActualError si la nueva coincide con la actual", async () => {
    const hasher = fakeHasher();
    const u = await gestor(hasher);
    const { repo } = fakeRepo(u);
    const sut = new CambiarPassword(repo, hasher);

    await expect(
      sut.execute({
        usuarioId: "u1",
        passwordActual: "actualOK1",
        passwordNueva: "actualOK1",
      }),
    ).rejects.toThrow(PasswordIgualALaActualError);
  });

  it("lanza NotFound si el usuario no existe", async () => {
    const hasher = fakeHasher();
    const { repo } = fakeRepo(null);
    const sut = new CambiarPassword(repo, hasher);

    await expect(
      sut.execute({
        usuarioId: "desconocido",
        passwordActual: "x",
        passwordNueva: "otraValida9",
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
