import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EditarServicio } from "../application/EditarServicio.js";
import { Servicio } from "../domain/Servicio.js";
import type { ServicioRepository } from "../domain/ports/ServicioRepository.js";
import type {
  NotificadorDeCambioServicio,
  NotificarCancelacionInput,
  NotificarEdicionInput,
} from "../domain/ports/NotificadorDeCambioServicio.js";

const HORA_MS = 60 * 60 * 1000;

function servicioConUniforme(uniforme: string): Servicio {
  return Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel X", direccion: "Calle 1" },
    tipoEvento: "BODA",
    cuposTotales: 3,
    uniforme,
    notas: "Llegar 30 min antes",
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

function spyNotificador(): NotificadorSpy {
  const cancelaciones: NotificarCancelacionInput[] = [];
  const ediciones: NotificarEdicionInput[] = [];
  return {
    cancelaciones,
    ediciones,
    notificarCancelacion: async (i) => {
      cancelaciones.push(i);
    },
    notificarEdicion: async (i) => {
      ediciones.push(i);
    },
  };
}

describe("EditarServicio (notificaciones)", () => {
  it("no notifica si el servicio no tiene asignaciones", async () => {
    const s = servicioConUniforme("Negro");
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new EditarServicio(repo, noti);

    await uc.execute({ id: s.id, uniforme: "Blanco" });

    expect(noti.ediciones).toHaveLength(0);
  });

  it("notifica solo el delta cuando cambia uniforme con asignaciones presentes", async () => {
    const s = servicioConUniforme("Negro");
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    s.aceptar({ camareroId: "c2", asignacionId: "a2" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new EditarServicio(repo, noti);

    await uc.execute({ id: s.id, uniforme: "Blanco", notas: "Llegar 30 min antes" });

    expect(noti.ediciones).toHaveLength(1);
    const aviso = noti.ediciones[0]!;
    expect([...aviso.camareroIds].sort()).toEqual(["c1", "c2"]);
    expect(aviso.cambios.uniforme).toEqual({ antes: "Negro", despues: "Blanco" });
    expect(aviso.cambios.notas).toBeUndefined(); // no cambio realmente
    expect(aviso.cambios.tipoEvento).toBeUndefined();
  });

  it("notifica cambios en los tres campos blandos cuando los tres cambian", async () => {
    const s = servicioConUniforme("Negro");
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new EditarServicio(repo, noti);

    await uc.execute({
      id: s.id,
      tipoEvento: "CORPORATIVO",
      uniforme: "Blanco",
      notas: "Nuevas notas",
    });

    const aviso = noti.ediciones[0]!;
    expect(aviso.cambios.tipoEvento).toEqual({
      antes: "BODA",
      despues: "CORPORATIVO",
    });
    expect(aviso.cambios.uniforme).toEqual({ antes: "Negro", despues: "Blanco" });
    expect(aviso.cambios.notas).toEqual({
      antes: "Llegar 30 min antes",
      despues: "Nuevas notas",
    });
  });

  it("no notifica si el valor nuevo es identico al anterior (delta vacio)", async () => {
    const s = servicioConUniforme("Negro");
    s.aceptar({ camareroId: "c1", asignacionId: "a1" });
    const repo = fakeRepo([s]);
    const noti = spyNotificador();
    const uc = new EditarServicio(repo, noti);

    await uc.execute({ id: s.id, uniforme: "Negro", notas: "Llegar 30 min antes" });

    expect(noti.ediciones).toHaveLength(0);
  });
});
