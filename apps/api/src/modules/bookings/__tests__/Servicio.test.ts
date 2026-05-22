import { describe, it, expect } from "vitest";
import { Servicio } from "../domain/Servicio.js";
import {
  CupoLlenoError,
  CuposInvalidosError,
  DuracionInvalidaError,
  FechaInvalidaError,
  ServicioNoDisponibleError,
  TransicionEstadoInvalidaError,
  YaAsignadoError,
} from "../domain/errors/BookingsErrors.js";

const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);

const baseInput = {
  id: "s1",
  fechaInicio: enUnaHora,
  duracionHoras: 4,
  lugar: { nombre: "Hotel X", direccion: "Calle 1" },
  tipoEvento: "BODA" as const,
  cuposTotales: 3,
};

function crear(overrides: Partial<typeof baseInput> = {}): Servicio {
  return Servicio.crear({ ...baseInput, ...overrides });
}

describe("Servicio — creacion y validaciones", () => {
  it("se crea en estado PUBLICADO con 0 cupos ocupados", () => {
    const s = crear();
    expect(s.estado).toBe("PUBLICADO");
    expect(s.cuposOcupados).toBe(0);
    expect(s.cuposTotales).toBe(3);
    expect(s.version).toBe(0);
  });

  it("rechaza fecha en el pasado", () => {
    const pasado = new Date(Date.now() - 1000);
    expect(() => crear({ fechaInicio: pasado })).toThrow(FechaInvalidaError);
  });

  it("rechaza duracion fuera de rango", () => {
    expect(() => crear({ duracionHoras: 0 })).toThrow(DuracionInvalidaError);
    expect(() => crear({ duracionHoras: 25 })).toThrow(DuracionInvalidaError);
  });

  it("rechaza cupos fuera de rango", () => {
    expect(() => crear({ cuposTotales: 0 })).toThrow(CuposInvalidosError);
    expect(() => crear({ cuposTotales: 201 })).toThrow(CuposInvalidosError);
  });
});

describe("Servicio — aceptar()", () => {
  it("permite aceptar mientras haya cupo", () => {
    const s = crear({ cuposTotales: 2 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(s.cuposOcupados).toBe(1);
    expect(s.estado).toBe("PUBLICADO");
  });

  it("al llenar el ultimo cupo transiciona a CUBIERTO", () => {
    const s = crear({ cuposTotales: 2 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    s.aceptar({ camareroId: "c2", asignacionId: "a2" });
    expect(s.estado).toBe("CUBIERTO");
    expect(s.estaCompleto).toBe(true);
  });

  it("rechaza si el servicio esta CUBIERTO", () => {
    const s = crear({ cuposTotales: 1 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(() =>
      s.aceptar({ camareroId: "c2", asignacionId: "a2" }),
    ).toThrow(ServicioNoDisponibleError);
  });

  it("rechaza si el camarero ya esta asignado", () => {
    const s = crear({ cuposTotales: 3 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(() =>
      s.aceptar({ camareroId: "c1", asignacionId: "a2" }),
    ).toThrow(YaAsignadoError);
  });

  it("rechaza si los cupos estan llenos (caso defensivo)", () => {
    // No se puede llegar aqui via API normal porque al llenarse cambia a CUBIERTO,
    // pero el aggregate protege el invariante por si acaso.
    const s = crear({ cuposTotales: 1 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    // El estado ya es CUBIERTO, el error es ServicioNoDisponibleError (estado).
    // Para forzar el chequeo de cupo: reconstituye con estado PUBLICADO falsamente.
    const forzado = Servicio.reconstituir({
      id: s.id,
      fechaInicio: s.fechaInicio,
      duracionHoras: s.duracionHoras,
      lugar: s.lugar,
      tipoEvento: s.tipoEvento,
      cuposTotales: 1,
      uniforme: null,
      notas: null,
      estado: "PUBLICADO",
      version: 0,
      creadoEn: new Date(),
      asignaciones: [{ id: "a1", camareroId: "c1", aceptadaEn: new Date() }],
    });
    expect(() =>
      forzado.aceptar({ camareroId: "c2", asignacionId: "a2" }),
    ).toThrow(CupoLlenoError);
  });

  it("haAceptado(camareroId) detecta al camarero asignado", () => {
    const s = crear({ cuposTotales: 2 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(s.haAceptado("c1")).toBe(true);
    expect(s.haAceptado("c2")).toBe(false);
  });
});

describe("Servicio — cancelar()", () => {
  it("desde PUBLICADO pasa a CANCELADO", () => {
    const s = crear();
    s.cancelar();
    expect(s.estado).toBe("CANCELADO");
  });

  it("desde CUBIERTO pasa a CANCELADO", () => {
    const s = crear({ cuposTotales: 1 });
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(s.estado).toBe("CUBIERTO");
    s.cancelar();
    expect(s.estado).toBe("CANCELADO");
  });

  it("desde CANCELADO falla", () => {
    const s = crear();
    s.cancelar();
    expect(() => s.cancelar()).toThrow(TransicionEstadoInvalidaError);
  });

  it("no se puede aceptar tras CANCELAR", () => {
    const s = crear();
    s.cancelar();
    expect(() =>
      s.aceptar({ camareroId: "c1", asignacionId: "a1" }),
    ).toThrow(ServicioNoDisponibleError);
  });
});
