import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CamareroConServicioSolapadoError,
  CamareroNoActivoError,
} from "../domain/errors/BookingsErrors.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import {
  AceptarServicio,
  type VerificarCamareroFn,
} from "../application/AceptarServicio.js";

const HORA_MS = 60 * 60 * 1000;
const CAMARERO_ID = "c1";

const verificarActivo: VerificarCamareroFn = async () => ({
  puedeAceptarServicios: true,
});

function crearFuturo(opts: { inicioEnHoras: number; duracionHoras: number }): Servicio {
  return Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + opts.inicioEnHoras * HORA_MS),
    duracionHoras: opts.duracionHoras,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales: 5,
  });
}

function reconstituirFinalizado(): Servicio {
  const inicioPasado = new Date(Date.now() - 24 * HORA_MS);
  return Servicio.reconstituir({
    id: randomUUID(),
    fechaInicio: inicioPasado,
    duracionHoras: 4,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales: 5,
    uniforme: null,
    notas: null,
    estado: "PUBLICADO",
    version: 1,
    creadoEn: new Date(Date.now() - 48 * HORA_MS),
    asignaciones: [
      {
        id: "a-pasada",
        camareroId: CAMARERO_ID,
        aceptadaEn: new Date(Date.now() - 30 * HORA_MS),
      },
    ],
  });
}

function fakeRepo(servicios: Servicio[]): ServicioRepository {
  const byId = new Map(servicios.map((s) => [s.id, s] as const));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async (s) => {
      byId.set(s.id, s);
    },
    listar: async () => Array.from(byId.values()),
    listarPorCamarero: async (camId) =>
      Array.from(byId.values()).filter((s) =>
        s.asignaciones.some((a) => a.camareroId === camId),
      ),
  };
}

describe("AceptarServicio: regla de no solape entre servicios del mismo camarero", () => {
  it("acepta cuando el camarero no tiene otros servicios", async () => {
    const s = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    const uc = new AceptarServicio(fakeRepo([s]), verificarActivo);
    const { asignacion } = await uc.execute({ servicioId: s.id, camareroId: CAMARERO_ID });
    expect(asignacion.camareroId).toBe(CAMARERO_ID);
  });

  it("acepta cuando los servicios estan en franjas distintas", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 2 });
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 12, duracionHoras: 2 });
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    const { asignacion } = await uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID });
    expect(asignacion.camareroId).toBe(CAMARERO_ID);
  });

  it("bloquea cuando dos servicios comparten el horario exacto", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    await expect(
      uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID }),
    ).rejects.toThrow(CamareroConServicioSolapadoError);
  });

  it("bloquea cuando el nuevo empieza durante un servicio aceptado", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 }); // [6, 10)
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 8, duracionHoras: 3 }); // [8, 11)
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    await expect(
      uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID }),
    ).rejects.toThrow(CamareroConServicioSolapadoError);
  });

  it("bloquea cuando el nuevo termina durante un servicio aceptado", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 8, duracionHoras: 4 }); // [8, 12)
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 }); // [6, 10)
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    await expect(
      uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID }),
    ).rejects.toThrow(CamareroConServicioSolapadoError);
  });

  it("bloquea cuando un servicio contiene al otro", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 10 }); // [6, 16)
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 8, duracionHoras: 2 }); // [8, 10)
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    await expect(
      uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID }),
    ).rejects.toThrow(CamareroConServicioSolapadoError);
  });

  it("permite servicios contiguos: uno termina exactamente cuando empieza el otro", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 }); // [6, 10)
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 10, duracionHoras: 4 }); // [10, 14)
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    const { asignacion } = await uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID });
    expect(asignacion.camareroId).toBe(CAMARERO_ID);
  });

  it("permite cuando el otro servicio del camarero esta CANCELADO", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    aceptado.cancelar();
    const nuevo = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    const { asignacion } = await uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID });
    expect(asignacion.camareroId).toBe(CAMARERO_ID);
  });

  it("permite cuando el otro servicio del camarero ya FINALIZO", async () => {
    const finalizado = reconstituirFinalizado();
    const nuevo = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    const uc = new AceptarServicio(fakeRepo([finalizado, nuevo]), verificarActivo);
    const { asignacion } = await uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID });
    expect(asignacion.camareroId).toBe(CAMARERO_ID);
  });

  it("el error expone datos del servicio existente que solapa", async () => {
    const aceptado = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    aceptado.aceptar({ camareroId: CAMARERO_ID, asignacionId: "a1" });
    const nuevo = crearFuturo({ inicioEnHoras: 7, duracionHoras: 2 });
    const uc = new AceptarServicio(fakeRepo([aceptado, nuevo]), verificarActivo);
    try {
      await uc.execute({ servicioId: nuevo.id, camareroId: CAMARERO_ID });
      expect.fail("debio lanzar");
    } catch (e) {
      expect(e).toBeInstanceOf(CamareroConServicioSolapadoError);
      const err = e as CamareroConServicioSolapadoError;
      expect(err.servicioExistente.id).toBe(aceptado.id);
      expect(err.servicioExistente.lugar).toBe("Hotel X");
      expect(err.code).toBe("CAMARERO_CON_SERVICIO_SOLAPADO");
      expect(err.httpStatus).toBe(409);
    }
  });

  it("camarero no activo: corta antes del chequeo de solape", async () => {
    const inactivo: VerificarCamareroFn = async () => ({ puedeAceptarServicios: false });
    const s = crearFuturo({ inicioEnHoras: 6, duracionHoras: 4 });
    const uc = new AceptarServicio(fakeRepo([s]), inactivo);
    await expect(
      uc.execute({ servicioId: s.id, camareroId: CAMARERO_ID }),
    ).rejects.toThrow(CamareroNoActivoError);
  });
});
