import { describe, it, expect } from "vitest";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import { ObtenerServicio } from "../application/ObtenerServicio.js";

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

describe("ObtenerServicio", () => {
  it("devuelve el servicio si existe", async () => {
    const s = crearServicio();
    const uc = new ObtenerServicio(fakeRepo(s));
    const out = await uc.execute("s1");
    expect(out.id).toBe("s1");
  });

  it("lanza NotFound si el id no existe", async () => {
    const uc = new ObtenerServicio(fakeRepo(null));
    await expect(uc.execute("desconocido")).rejects.toThrow(NotFoundError);
  });
});
