import { describe, it, expect } from "vitest";
import { BIO_MIN_LONGITUD, Camarero } from "../domain/Camarero.js";
import {
  BioInvalidaError,
  NombreInvalidoError,
  TelefonoInvalidoError,
} from "../domain/errors/StaffErrors.js";

const BIO_VALIDA =
  "Cinco anos como camarero en bodas y cocteles, equipo polivalente y servicio impecable.";

const baseInput = {
  id: "c1",
  nombre: "Juan Perez",
  email: "juan@cama.es",
  telefono: "600123456",
  bio: BIO_VALIDA,
};

describe("Camarero (agregado)", () => {
  it("se crea en estado PENDIENTE_APROBACION", () => {
    const c = Camarero.crear(baseInput);
    expect(c.estadoCuenta).toBe("PENDIENTE_APROBACION");
    expect(c.puedeAceptarServicios).toBe(false);
  });

  it("normaliza email a minusculas y recorta", () => {
    const c = Camarero.crear({ ...baseInput, email: "  Juan@CAMA.es " });
    expect(c.email).toBe("juan@cama.es");
  });

  it("rechaza nombre demasiado corto", () => {
    expect(() => Camarero.crear({ ...baseInput, nombre: "J" })).toThrow(
      NombreInvalidoError,
    );
  });

  it("rechaza nombre demasiado largo", () => {
    expect(() =>
      Camarero.crear({ ...baseInput, nombre: "x".repeat(81) }),
    ).toThrow(NombreInvalidoError);
  });

  it("rechaza telefono invalido", () => {
    expect(() => Camarero.crear({ ...baseInput, telefono: "123" })).toThrow(
      TelefonoInvalidoError,
    );
  });

  it("aprobar() lo pasa a ACTIVO y permite aceptar servicios", () => {
    const c = Camarero.crear(baseInput);
    c.aprobar();
    expect(c.estadoCuenta).toBe("ACTIVO");
    expect(c.puedeAceptarServicios).toBe(true);
  });

  it("aprobar() es idempotente desde ACTIVO", () => {
    const c = Camarero.crear(baseInput);
    c.aprobar();
    c.aprobar();
    expect(c.estadoCuenta).toBe("ACTIVO");
  });

  it("suspender() lo bloquea para aceptar servicios", () => {
    const c = Camarero.crear(baseInput);
    c.aprobar();
    c.suspender();
    expect(c.estadoCuenta).toBe("SUSPENDIDO");
    expect(c.puedeAceptarServicios).toBe(false);
  });

  it("aprobar() puede reactivar a un camarero SUSPENDIDO", () => {
    const c = Camarero.crear(baseInput);
    c.aprobar();
    c.suspender();
    c.aprobar();
    expect(c.estadoCuenta).toBe("ACTIVO");
  });

  it("rechaza bio demasiado corta", () => {
    expect(() => Camarero.crear({ ...baseInput, bio: "hola" })).toThrow(
      BioInvalidaError,
    );
  });

  it("rechaza bio vacia o solo espacios", () => {
    expect(() => Camarero.crear({ ...baseInput, bio: "   " })).toThrow(
      BioInvalidaError,
    );
  });

  it("rechaza bio demasiado larga", () => {
    expect(() =>
      Camarero.crear({ ...baseInput, bio: "x".repeat(1001) }),
    ).toThrow(BioInvalidaError);
  });

  it("recorta espacios de la bio y la expone", () => {
    const c = Camarero.crear({ ...baseInput, bio: `   ${BIO_VALIDA}   ` });
    expect(c.bio).toBe(BIO_VALIDA);
    expect(c.bio.length).toBeGreaterThanOrEqual(BIO_MIN_LONGITUD);
  });
});
