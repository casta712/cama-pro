import { describe, it, expect } from "vitest";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import {
  ListarAsignacionesDeServicio,
  type ObtenerCamarerosContactoFn,
} from "../application/ListarAsignacionesDeServicio.js";

const HORA_MS = 60 * 60 * 1000;

function crearServicio(): Servicio {
  return Servicio.crear({
    id: "s1",
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales: 3,
  });
}

function fakeRepo(servicio: Servicio | null): ServicioRepository {
  return {
    findById: async (id) => (servicio && servicio.id === id ? servicio : null),
    save: async () => undefined,
    listar: async () => (servicio ? [servicio] : []),
    listarPorCamarero: async () => (servicio ? [servicio] : []),
  };
}

const fakeContactos: ObtenerCamarerosContactoFn = async (ids) =>
  ids.map((id) => ({
    id,
    nombre: `Camarero ${id}`,
    email: `${id}@cama.es`,
    telefono: `600${id.slice(-3).padStart(3, "0")}`,
  }));

describe("ListarAsignacionesDeServicio", () => {
  it("devuelve [] si el servicio no tiene asignaciones", async () => {
    const s = crearServicio();
    const uc = new ListarAsignacionesDeServicio(fakeRepo(s), fakeContactos);
    const out = await uc.execute("s1");
    expect(out).toEqual([]);
  });

  it("enriquece cada asignacion con nombre/email/telefono", async () => {
    const s = crearServicio();
    s.aceptar({ camareroId: "c-ana", asignacionId: "a1" });
    s.aceptar({ camareroId: "c-bob", asignacionId: "a2" });

    const uc = new ListarAsignacionesDeServicio(fakeRepo(s), fakeContactos);
    const out = await uc.execute("s1");

    expect(out).toHaveLength(2);
    const [primera, segunda] = out;
    expect(primera).toMatchObject({
      id: "a1",
      camareroId: "c-ana",
      nombre: "Camarero c-ana",
      email: "c-ana@cama.es",
    });
    expect(segunda?.camareroId).toBe("c-bob");
  });

  it("rellena placeholder si un camarero ya no existe en staff", async () => {
    const s = crearServicio();
    s.aceptar({ camareroId: "c-borrado", asignacionId: "a1" });
    const sinContactos: ObtenerCamarerosContactoFn = async () => [];
    const uc = new ListarAsignacionesDeServicio(fakeRepo(s), sinContactos);
    const out = await uc.execute("s1");
    const [unica] = out;
    expect(unica?.nombre).toBe("Camarero eliminado");
    expect(unica?.email).toBe("");
  });

  it("lanza NotFound si el servicio no existe", async () => {
    const uc = new ListarAsignacionesDeServicio(fakeRepo(null), fakeContactos);
    await expect(uc.execute("desconocido")).rejects.toThrow(NotFoundError);
  });
});
