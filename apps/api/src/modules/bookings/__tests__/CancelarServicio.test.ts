import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { CancelarServicio } from "../application/CancelarServicio.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type {
  NotificadorDeCambioServicio,
  NotificarCancelacionInput,
  NotificarEdicionInput,
} from "../domain/ports/NotificadorDeCambioServicio.js";

const HORA_MS = 60 * 60 * 1000;

function servicioFuturo(): Servicio {
  return Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales: 3,
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

interface NotificadorSpy extends NotificadorDeCambioServicio {
  cancelaciones: NotificarCancelacionInput[];
  ediciones: NotificarEdicionInput[];
}

function spyNotificador(opts: { fallar?: boolean } = {}): NotificadorSpy {
  const cancelaciones: NotificarCancelacionInput[] = [];
  const ediciones: NotificarEdicionInput[] = [];
  return {
    cancelaciones,
    ediciones,
    notificarCancelacion: async (input) => {
      if (opts.fallar) throw new Error("boom");
      cancelaciones.push(input);
    },
    notificarEdicion: async (input) => {
      ediciones.push(input);
    },
  };
}

describe("CancelarServicio", () => {
  it("cancela el servicio y notifica a todos los camareros con asignacion", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    s.aceptar({ camareroId: "c2", asignacionId: "a2" });

    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new CancelarServicio(repo, noti);

    const resultado = await uc.execute(s.id);

    expect(resultado.estado).toBe("CANCELADO");
    expect(noti.cancelaciones).toHaveLength(1);
    const aviso = noti.cancelaciones[0]!;
    expect(aviso.servicioId).toBe(s.id);
    expect([...aviso.camareroIds].sort()).toEqual(["c1", "c2"]);
    expect(aviso.servicio.lugar).toBe("Hotel X");
    expect(aviso.servicio.duracionHoras).toBe(4);
  });

  it("notifica con lista vacia si el servicio no tiene asignaciones (no falla)", async () => {
    const s = servicioFuturo();
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new CancelarServicio(repo, noti);

    await uc.execute(s.id);

    expect(noti.cancelaciones).toHaveLength(1);
    expect(noti.cancelaciones[0]!.camareroIds).toEqual([]);
  });

  it("404 si el servicio no existe", async () => {
    const repo = fakeRepo([]);
    const noti = spyNotificador();
    const uc = new CancelarServicio(repo, noti);

    await expect(uc.execute("fantasma")).rejects.toThrow(NotFoundError);
    expect(noti.cancelaciones).toHaveLength(0);
  });

  it("si la notificacion falla, el servicio queda cancelado igualmente", async () => {
    const s = servicioFuturo();
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador({ fallar: true });
    const uc = new CancelarServicio(repo, noti);

    const resultado = await uc.execute(s.id);

    expect(resultado.estado).toBe("CANCELADO");
    const persistido = await repo.findById(s.id);
    expect(persistido!.estado).toBe("CANCELADO");
  });
});
