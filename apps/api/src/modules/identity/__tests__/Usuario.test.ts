import { describe, it, expect } from "vitest";
import { Usuario } from "../domain/Usuario.js";
import { Email } from "../domain/value-objects/Email.js";
import {
  EmailInvalidoError,
  RolUsuarioIncoherenteError,
} from "../domain/errors/IdentityErrors.js";

describe("Email (value object)", () => {
  it("normaliza a minusculas y recorta espacios", () => {
    expect(Email.of("  Foo@BAR.com ").value).toBe("foo@bar.com");
  });

  it("dos emails con el mismo valor normalizado son iguales", () => {
    expect(Email.of("a@b.com").equals(Email.of("A@B.COM"))).toBe(true);
  });

  it("rechaza formato invalido con EmailInvalidoError", () => {
    expect(() => Email.of("sin-arroba")).toThrow(EmailInvalidoError);
    expect(() => Email.of("@b.com")).toThrow(EmailInvalidoError);
    expect(() => Email.of("a@b")).toThrow(EmailInvalidoError);
  });
});

describe("Usuario (agregado)", () => {
  const baseGestor = {
    id: "u1",
    email: Email.of("gestor@cama.es"),
    passwordHash: "hash",
    rol: "GESTOR" as const,
  };

  const baseCamarero = {
    id: "u2",
    email: Email.of("camarero@cama.es"),
    passwordHash: "hash",
    rol: "CAMARERO" as const,
    camareroId: "c1",
  };

  it("crea un Gestor sin camareroId", () => {
    const u = Usuario.crear(baseGestor);
    expect(u.rol).toBe("GESTOR");
    expect(u.camareroId).toBeNull();
  });

  it("crea un Camarero con camareroId", () => {
    const u = Usuario.crear(baseCamarero);
    expect(u.rol).toBe("CAMARERO");
    expect(u.camareroId).toBe("c1");
  });

  it("rechaza Gestor con camareroId (invariante)", () => {
    expect(() =>
      Usuario.crear({ ...baseGestor, camareroId: "c1" }),
    ).toThrow(RolUsuarioIncoherenteError);
  });

  it("rechaza Camarero sin camareroId (invariante)", () => {
    const { camareroId: _omit, ...sinId } = baseCamarero;
    expect(() => Usuario.crear(sinId)).toThrow(RolUsuarioIncoherenteError);
  });
});
