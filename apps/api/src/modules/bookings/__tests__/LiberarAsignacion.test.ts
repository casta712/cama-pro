import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { LiberarAsignacion } from "../application/LiberarAsignacion.js";
import {
  CamareroSinAsignacionError,
  ServicioNoLiberableError,
} from "../domain/errors/BookingsErrors.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type {
  NotificadorDeMovimientoAsignacion,
  NotificarLiberacionInput,
} from "../domain/ports/NotificadorDeMovimientoAsignacion.js";
import type { ObtenerCamarerosContactoFn } from "../application/ListarAsignacionesDeServicio.js";

const HORA_MS = 60 * 60 * 1000;

function servicioFuturo(cuposTotales = 3): Servicio {
  return Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales,
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

interface NotificadorSpy extends NotificadorDeMovimientoAsignacion {
  liberaciones: NotificarLiberacionInput[];
}

function spyNotificador(opts: { fallar?: boolean } = {}): NotificadorSpy {
  const liberaciones: NotificarLiberacionInput[] = [];
  return {
    liberaciones,
    notificarLiberacion: async (input) => {
      if (opts.fallar) throw new Error("boom");
      liberaciones.push(input);
    },
  };
}

const contactosFake =
  (nombres: Record<string, string>): ObtenerCamarerosContactoFn =>
  async (ids) =>
    ids
      .filter((id) => nombres[id] !== undefined)
      .map((id) => ({
        id,
        nombre: nombres[id]!,
        email: `${id}@x.com`,
        telefono: "600",
      }));

describe("LiberarAsignacion", () => {
  it("libera la asignacion y notifica al gestor con el nombre del camarero", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c-bob", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(
      repo,
      noti,
      contactosFake({ "c-bob": "Bob" }),
    );

    const out = await uc.execute({
      servicioId: s.id,
      camareroId: "c-bob",
    });

    expect(out.asignacionId).toBe("a1");
    expect(out.volvioAPublicado).toBe(false);
    expect(noti.liberaciones).toHaveLength(1);
    const aviso = noti.liberaciones[0]!;
    expect(aviso.servicioId).toBe(s.id);
    expect(aviso.camareroId).toBe("c-bob");
    expect(aviso.camareroNombre).toBe("Bob");
    expect(aviso.servicio.lugar).toBe("Hotel X");
  });

  it("usa 'Camarero' como fallback cuando el nombre no se puede resolver", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c-borrado", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(
      repo,
      noti,
      contactosFake({}), // nadie devuelto
    );

    await uc.execute({ servicioId: s.id, camareroId: "c-borrado" });

    expect(noti.liberaciones[0]!.camareroNombre).toBe("Camarero");
  });

  it("404 si el servicio no existe (no notifica)", async () => {
    const repo = fakeRepo([]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(repo, noti, contactosFake({}));

    await expect(
      uc.execute({ servicioId: "fantasma", camareroId: "c1" }),
    ).rejects.toThrow(NotFoundError);
    expect(noti.liberaciones).toHaveLength(0);
  });

  it("propaga CamareroSinAsignacionError si el camarero no tiene asignacion (no notifica)", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(repo, noti, contactosFake({ c1: "Ana" }));

    await expect(
      uc.execute({ servicioId: s.id, camareroId: "intruso" }),
    ).rejects.toThrow(CamareroSinAsignacionError);
    expect(noti.liberaciones).toHaveLength(0);
  });

  it("propaga ServicioNoLiberableError si el servicio esta CANCELADO", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    s.cancelar();
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(repo, noti, contactosFake({ c1: "Ana" }));

    await expect(
      uc.execute({ servicioId: s.id, camareroId: "c1" }),
    ).rejects.toThrow(ServicioNoLiberableError);
    expect(noti.liberaciones).toHaveLength(0);
  });

  it("si el notificador falla, la liberacion queda persistida igualmente", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador({ fallar: true });
    const uc = new LiberarAsignacion(repo, noti, contactosFake({ c1: "Ana" }));

    await uc.execute({ servicioId: s.id, camareroId: "c1" });

    const persistido = await repo.findById(s.id);
    expect(persistido!.haAceptado("c1")).toBe(false);
    expect(persistido!.cuposOcupados).toBe(0);
  });

  it("reporta volvioAPublicado=true cuando libera el ultimo cupo de un CUBIERTO", async () => {
    const s = servicioFuturo(1);
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    expect(s.estado).toBe("CUBIERTO");
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new LiberarAsignacion(repo, noti, contactosFake({ c1: "Ana" }));

    const out = await uc.execute({ servicioId: s.id, camareroId: "c1" });

    expect(out.volvioAPublicado).toBe(true);
    expect(s.estado).toBe("PUBLICADO");
  });
});
