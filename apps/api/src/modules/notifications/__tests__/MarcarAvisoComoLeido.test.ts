import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../shared/errors/AppError.js";
import { Notificacion } from "../domain/Notificacion.js";
import type { NotificacionRepository } from "../domain/ports/NotificacionRepository.js";
import { MarcarAvisoComoLeido } from "../application/MarcarAvisoComoLeido.js";

const SNAPSHOT = {
  lugar: "Hotel X",
  fechaInicio: "2026-06-01T18:00:00.000Z",
  duracionHoras: 4,
};

function fakeRepo(initial: Notificacion[]): NotificacionRepository {
  const byId = new Map(initial.map((n) => [n.id, n] as const));
  return {
    findById: async (id) => byId.get(id) ?? null,
    listarPorCamarero: async (camId) =>
      Array.from(byId.values()).filter((n) => n.camareroId === camId),
    contarNoLeidas: async (camId) =>
      Array.from(byId.values()).filter(
        (n) => n.camareroId === camId && !n.estaLeida,
      ).length,
    save: async (n) => {
      byId.set(n.id, n);
    },
    saveMany: async (arr) => {
      for (const n of arr) byId.set(n.id, n);
    },
    marcarTodasLeidas: async () => {
      throw new Error("no se usa en estos tests");
    },
  };
}

function avisoNoLeido(): Notificacion {
  return Notificacion.crearCancelacion({
    id: "n1",
    camareroId: "c1",
    servicioId: "s1",
    payload: { servicio: SNAPSHOT },
  });
}

describe("MarcarAvisoComoLeido", () => {
  it("marca un aviso del propio camarero como leido", async () => {
    const repo = fakeRepo([avisoNoLeido()]);
    const uc = new MarcarAvisoComoLeido(repo);

    await uc.execute({ camareroId: "c1", avisoId: "n1" });

    const persistido = await repo.findById("n1");
    expect(persistido!.estaLeida).toBe(true);
  });

  it("es idempotente: marcar dos veces no falla", async () => {
    const repo = fakeRepo([avisoNoLeido()]);
    const uc = new MarcarAvisoComoLeido(repo);

    await uc.execute({ camareroId: "c1", avisoId: "n1" });
    await uc.execute({ camareroId: "c1", avisoId: "n1" });

    const persistido = await repo.findById("n1");
    expect(persistido!.estaLeida).toBe(true);
  });

  it("404 si el aviso no existe", async () => {
    const repo = fakeRepo([]);
    const uc = new MarcarAvisoComoLeido(repo);

    await expect(
      uc.execute({ camareroId: "c1", avisoId: "fantasma" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("403 si el aviso es de otro camarero (no filtra existencia con NotFound)", async () => {
    const repo = fakeRepo([avisoNoLeido()]);
    const uc = new MarcarAvisoComoLeido(repo);

    await expect(
      uc.execute({ camareroId: "otro", avisoId: "n1" }),
    ).rejects.toThrow(ForbiddenError);
    const persistido = await repo.findById("n1");
    expect(persistido!.estaLeida).toBe(false);
  });
});
