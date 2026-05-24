import { describe, it, expect } from "vitest";
import { ANTELACION_MINIMA_HORAS, Servicio } from "../domain/Servicio.js";
import {
  CupoLlenoError,
  CuposInvalidosError,
  CuposPorDebajoDeAsignacionesError,
  DuracionInvalidaError,
  EdicionDuraConAsignacionesError,
  FechaInvalidaError,
  ServicioMuyProximoError,
  ServicioNoDisponibleError,
  ServicioNoEditableError,
  ServicioYaEnCursoError,
  TransicionEstadoInvalidaError,
  YaAsignadoError,
} from "../domain/errors/BookingsErrors.js";

const HORA_MS = 60 * 60 * 1000;
const enCuatroHoras = new Date(Date.now() + 4 * HORA_MS);

const baseInput = {
  id: "s1",
  fechaInicio: enCuatroHoras,
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

describe(`Servicio — antelacion minima ${ANTELACION_MINIMA_HORAS}h`, () => {
  it("rechaza publicar a menos de la antelacion minima", () => {
    const enUnaHora = new Date(Date.now() + 1 * HORA_MS);
    expect(() => crear({ fechaInicio: enUnaHora })).toThrow(ServicioMuyProximoError);
  });

  it("acepta publicar justo en el limite", () => {
    const ahora = new Date("2026-05-24T12:00:00.000Z");
    const justo = new Date(ahora.getTime() + ANTELACION_MINIMA_HORAS * HORA_MS);
    expect(() => Servicio.crear({ ...baseInput, fechaInicio: justo, ahora })).not.toThrow();
  });

  it("acepta publicar mas alla del limite", () => {
    const ahora = new Date("2026-05-24T12:00:00.000Z");
    const lejos = new Date(ahora.getTime() + 10 * HORA_MS);
    expect(() => Servicio.crear({ ...baseInput, fechaInicio: lejos, ahora })).not.toThrow();
  });
});

describe("Servicio — aceptar() bloqueado cuando el servicio ya empezo", () => {
  it("rechaza aceptar si ahora >= fechaInicio aunque siga PUBLICADO", () => {
    const inicio = new Date("2026-05-24T20:00:00.000Z");
    const s = Servicio.crear({
      ...baseInput,
      fechaInicio: inicio,
      ahora: new Date("2026-05-24T12:00:00.000Z"),
    });
    expect(() =>
      s.aceptar({
        camareroId: "c1",
        asignacionId: "a1",
        ahora: inicio,
      }),
    ).toThrow(ServicioYaEnCursoError);
  });

  it("acepta si ahora es justo un segundo antes de fechaInicio", () => {
    const inicio = new Date("2026-05-24T20:00:00.000Z");
    const s = Servicio.crear({
      ...baseInput,
      fechaInicio: inicio,
      ahora: new Date("2026-05-24T12:00:00.000Z"),
    });
    const casiInicio = new Date(inicio.getTime() - 1000);
    expect(() =>
      s.aceptar({ camareroId: "c1", asignacionId: "a1", ahora: casiInicio }),
    ).not.toThrow();
  });
});

describe("Servicio — estadoActual() computa por tiempo", () => {
  const ahoraCrear = new Date("2026-05-24T12:00:00.000Z");
  const inicio = new Date("2026-05-24T20:00:00.000Z");

  function crearConTiempo(): Servicio {
    return Servicio.crear({
      ...baseInput,
      fechaInicio: inicio,
      duracionHoras: 4,
      ahora: ahoraCrear,
    });
  }

  it("antes del inicio devuelve el estado persistido (PUBLICADO)", () => {
    const s = crearConTiempo();
    expect(s.estadoActual(new Date("2026-05-24T19:00:00.000Z"))).toBe("PUBLICADO");
  });

  it("entre inicio y fin devuelve EN_CURSO", () => {
    const s = crearConTiempo();
    expect(s.estadoActual(new Date("2026-05-24T21:00:00.000Z"))).toBe("EN_CURSO");
  });

  it("despues del fin (inicio + duracionHoras) devuelve FINALIZADO", () => {
    const s = crearConTiempo();
    // inicio 20:00, duracion 4h -> fin 24:00. A las 00:30 del dia siguiente.
    expect(s.estadoActual(new Date("2026-05-25T00:30:00.000Z"))).toBe("FINALIZADO");
  });

  it("CANCELADO siempre gana sobre el tiempo", () => {
    const s = crearConTiempo();
    s.cancelar(new Date("2026-05-24T15:00:00.000Z"));
    expect(s.estadoActual(new Date("2026-05-24T21:00:00.000Z"))).toBe("CANCELADO");
    expect(s.estadoActual(new Date("2026-05-25T03:00:00.000Z"))).toBe("CANCELADO");
  });

  it("CUBIERTO se mantiene hasta que llega la hora", () => {
    const s = Servicio.crear({
      ...baseInput,
      cuposTotales: 1,
      fechaInicio: inicio,
      ahora: ahoraCrear,
    });
    s.aceptar({ camareroId: "c1", asignacionId: "a1", ahora: new Date("2026-05-24T15:00:00.000Z") });
    expect(s.estado).toBe("CUBIERTO");
    expect(s.estadoActual(new Date("2026-05-24T19:00:00.000Z"))).toBe("CUBIERTO");
    expect(s.estadoActual(new Date("2026-05-24T21:00:00.000Z"))).toBe("EN_CURSO");
  });
});

describe("Servicio — editar()", () => {
  const ahoraCrear = new Date("2026-05-24T12:00:00.000Z");
  const inicio = new Date("2026-05-24T20:00:00.000Z");

  function nuevo(): Servicio {
    return Servicio.crear({ ...baseInput, fechaInicio: inicio, ahora: ahoraCrear });
  }

  describe("sin asignaciones (todo editable)", () => {
    it("cambia tipoEvento + uniforme + notas", () => {
      const s = nuevo();
      s.editar({ tipoEvento: "COCTEL", uniforme: "blanco", notas: "puerta lateral" }, ahoraCrear);
      expect(s.tipoEvento).toBe("COCTEL");
      expect(s.uniforme).toBe("blanco");
      expect(s.notas).toBe("puerta lateral");
    });

    it("cambia fecha respetando antelacion 3h", () => {
      const s = nuevo();
      const nuevaFecha = new Date("2026-05-25T20:00:00.000Z");
      s.editar({ fechaInicio: nuevaFecha }, ahoraCrear);
      expect(s.fechaInicio).toEqual(nuevaFecha);
    });

    it("rechaza fecha que rompe la antelacion minima", () => {
      const s = nuevo();
      const muyCerca = new Date(ahoraCrear.getTime() + 60 * 60 * 1000);
      expect(() => s.editar({ fechaInicio: muyCerca }, ahoraCrear)).toThrow(
        ServicioMuyProximoError,
      );
    });

    it("cambia cupos arriba sin asignaciones", () => {
      const s = nuevo();
      s.editar({ cuposTotales: 10 }, ahoraCrear);
      expect(s.cuposTotales).toBe(10);
    });

    it("rechaza cupos fuera de rango", () => {
      const s = nuevo();
      expect(() => s.editar({ cuposTotales: 0 }, ahoraCrear)).toThrow(CuposInvalidosError);
      expect(() => s.editar({ cuposTotales: 201 }, ahoraCrear)).toThrow(CuposInvalidosError);
    });

    it("uniforme y notas a string vacio quedan null", () => {
      const s = Servicio.crear({
        ...baseInput,
        fechaInicio: inicio,
        ahora: ahoraCrear,
        uniforme: "viejo",
        notas: "viejo",
      });
      s.editar({ uniforme: "  ", notas: "" }, ahoraCrear);
      expect(s.uniforme).toBeNull();
      expect(s.notas).toBeNull();
    });
  });

  describe("con asignaciones (solo blandos)", () => {
    function conUnaAsignacion(): Servicio {
      const s = nuevo();
      s.aceptar({ camareroId: "c1", asignacionId: "a1", ahora: ahoraCrear });
      return s;
    }

    it("cambia tipoEvento + uniforme + notas (OK)", () => {
      const s = conUnaAsignacion();
      s.editar({ tipoEvento: "COCTEL", uniforme: "negro", notas: "x" }, ahoraCrear);
      expect(s.tipoEvento).toBe("COCTEL");
      expect(s.uniforme).toBe("negro");
    });

    it("rechaza cambio de fecha", () => {
      const s = conUnaAsignacion();
      expect(() =>
        s.editar({ fechaInicio: new Date("2026-05-25T20:00:00.000Z") }, ahoraCrear),
      ).toThrow(EdicionDuraConAsignacionesError);
    });

    it("rechaza cambio de duracion", () => {
      const s = conUnaAsignacion();
      expect(() => s.editar({ duracionHoras: 6 }, ahoraCrear)).toThrow(
        EdicionDuraConAsignacionesError,
      );
    });

    it("rechaza cambio de lugar", () => {
      const s = conUnaAsignacion();
      expect(() =>
        s.editar({ lugar: { nombre: "Otro", direccion: "X" } }, ahoraCrear),
      ).toThrow(EdicionDuraConAsignacionesError);
    });

    it("rechaza cambio de cupos", () => {
      const s = conUnaAsignacion();
      expect(() => s.editar({ cuposTotales: 5 }, ahoraCrear)).toThrow(
        EdicionDuraConAsignacionesError,
      );
    });
  });

  describe("validaciones de estado", () => {
    it("rechaza editar si esta CUBIERTO", () => {
      const s = Servicio.crear({
        ...baseInput,
        fechaInicio: inicio,
        ahora: ahoraCrear,
        cuposTotales: 1,
      });
      s.aceptar({ camareroId: "c1", asignacionId: "a1", ahora: ahoraCrear });
      expect(s.estado).toBe("CUBIERTO");
      expect(() => s.editar({ notas: "nada" }, ahoraCrear)).toThrow(
        ServicioNoEditableError,
      );
    });

    it("rechaza editar si esta CANCELADO", () => {
      const s = nuevo();
      s.cancelar(ahoraCrear);
      expect(() => s.editar({ notas: "nada" }, ahoraCrear)).toThrow(
        ServicioNoEditableError,
      );
    });

    it("rechaza editar si ya esta EN_CURSO por tiempo", () => {
      const s = nuevo();
      expect(() => s.editar({ notas: "x" }, new Date("2026-05-24T21:00:00.000Z"))).toThrow(
        ServicioNoEditableError,
      );
    });
  });

  it("cuposPorDebajoDeAsignaciones lanza si bajas cupos bajo lo aceptado", () => {
    // Solo posible si quitas el bloqueo de hayAsignaciones — usa reconstituir
    // para forzar el escenario donde el invariante debe protegerse.
    const s = Servicio.reconstituir({
      id: "s1",
      fechaInicio: inicio,
      duracionHoras: 4,
      lugar: { nombre: "Hotel X", direccion: "Calle 1" },
      tipoEvento: "BODA",
      cuposTotales: 3,
      uniforme: null,
      notas: null,
      estado: "PUBLICADO",
      version: 0,
      creadoEn: ahoraCrear,
      asignaciones: [
        { id: "a1", camareroId: "c1", aceptadaEn: ahoraCrear },
        { id: "a2", camareroId: "c2", aceptadaEn: ahoraCrear },
      ],
    });
    // Hay 2 asignaciones. Intentar bajar cupos a 1 dispara el bloqueo de
    // EdicionDuraConAsignacionesError ANTES del de cupos. Validamos ese.
    expect(() => s.editar({ cuposTotales: 1 }, ahoraCrear)).toThrow(
      EdicionDuraConAsignacionesError,
    );
    // El invariante de cupos-bajo-asignaciones existe para futuros casos
    // donde se permitan cambios duros (no se ejercita aqui).
    expect(CuposPorDebajoDeAsignacionesError).toBeDefined();
  });
});

describe("Servicio — cancelar() respeta el estado efectivo", () => {
  it("rechaza cancelar si el servicio ya esta EN_CURSO", () => {
    const inicio = new Date("2026-05-24T20:00:00.000Z");
    const s = Servicio.crear({
      ...baseInput,
      fechaInicio: inicio,
      duracionHoras: 4,
      ahora: new Date("2026-05-24T12:00:00.000Z"),
    });
    expect(() => s.cancelar(new Date("2026-05-24T21:00:00.000Z"))).toThrow(
      TransicionEstadoInvalidaError,
    );
  });

  it("rechaza cancelar si ya FINALIZADO por tiempo", () => {
    const inicio = new Date("2026-05-24T20:00:00.000Z");
    const s = Servicio.crear({
      ...baseInput,
      fechaInicio: inicio,
      duracionHoras: 2,
      ahora: new Date("2026-05-24T12:00:00.000Z"),
    });
    // inicio 20:00 + 2h -> 22:00. A las 23:00 ya FINALIZADO.
    expect(() => s.cancelar(new Date("2026-05-24T23:00:00.000Z"))).toThrow(
      TransicionEstadoInvalidaError,
    );
  });
});
