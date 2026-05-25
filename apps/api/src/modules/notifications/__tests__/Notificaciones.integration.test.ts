import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Servicio } from "../../bookings/domain/Servicio.js";
import { PrismaServicioRepository } from "../../bookings/infrastructure/PrismaServicioRepository.js";
import { CancelarServicio } from "../../bookings/application/CancelarServicio.js";
import { EditarServicio } from "../../bookings/application/EditarServicio.js";
import { PrismaNotificacionRepository } from "../infrastructure/PrismaNotificacionRepository.js";
import { NotificadorDeCambioServicioEnDB } from "../infrastructure/NotificadorDeCambioServicioEnDB.js";
import {
  disconnectTestPrisma,
  getTestPrisma,
  resetDb,
} from "../../../../test-helpers/integrationDb.js";

const HORA_MS = 60 * 60 * 1000;
const BIO_MIN =
  "Soy camarero con experiencia en eventos y servicios de gran formato.";

const prisma = getTestPrisma();
const servicios = new PrismaServicioRepository(prisma);
const avisos = new PrismaNotificacionRepository(prisma);
const notificador = new NotificadorDeCambioServicioEnDB(avisos);
const cancelarUC = new CancelarServicio(servicios, notificador);
const editarUC = new EditarServicio(servicios, notificador);

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await disconnectTestPrisma();
});

async function insertarCamarero(): Promise<string> {
  const id = randomUUID();
  await prisma.camarero.create({
    data: {
      id,
      nombre: `Camarero ${id.slice(0, 4)}`,
      email: `${id.slice(0, 8)}@test.local`,
      telefono: "600000000",
      bio: BIO_MIN,
      estadoCuenta: "ACTIVO",
    },
  });
  return id;
}

async function insertarServicioConAsignaciones(
  camareroIds: string[],
  opts: { uniforme?: string; notas?: string } = {},
): Promise<string> {
  // +1 sobre los asignados para que el servicio quede en PUBLICADO (no
  // CUBIERTO) y por tanto pueda editarse.
  const s = Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel Test", direccion: "Calle Test 1" },
    tipoEvento: "BODA",
    cuposTotales: camareroIds.length + 1,
    uniforme: opts.uniforme,
    notas: opts.notas,
  });
  for (const camareroId of camareroIds) {
    s.aceptar({ camareroId, asignacionId: randomUUID() });
  }
  await servicios.save(s);
  return s.id;
}

describe("Notificaciones (integracion con Postgres)", () => {
  it("cancelar un servicio con dos asignados crea dos avisos no leidos", async () => {
    const c1 = await insertarCamarero();
    const c2 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([c1, c2]);

    await cancelarUC.execute(servicioId);

    const rows = await prisma.notificacion.findMany({ where: { servicioId } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tipo === "SERVICIO_CANCELADO")).toBe(true);
    expect(rows.every((r) => r.leidaEn === null)).toBe(true);
    const camIds = rows.map((r) => r.camareroId).sort();
    expect(camIds).toEqual([c1, c2].sort());
  });

  it("cancelar un servicio sin asignados no crea avisos", async () => {
    const servicioId = await insertarServicioConAsignaciones([]);

    await cancelarUC.execute(servicioId);

    const count = await prisma.notificacion.count({ where: { servicioId } });
    expect(count).toBe(0);
  });

  it("editar uniforme con asignados crea avisos con el delta correcto", async () => {
    const c1 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([c1], {
      uniforme: "Negro",
    });

    await editarUC.execute({ id: servicioId, uniforme: "Blanco" });

    const rows = await prisma.notificacion.findMany({ where: { servicioId } });
    expect(rows).toHaveLength(1);
    const aviso = rows[0]!;
    expect(aviso.camareroId).toBe(c1);
    expect(aviso.tipo).toBe("SERVICIO_EDITADO");
    const payload = aviso.payload as {
      cambios: { uniforme?: { antes: string; despues: string } };
    };
    expect(payload.cambios.uniforme).toEqual({
      antes: "Negro",
      despues: "Blanco",
    });
  });

  it("editar sin cambios reales no crea aviso", async () => {
    const c1 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([c1], {
      uniforme: "Negro",
    });

    await editarUC.execute({ id: servicioId, uniforme: "Negro" });

    const count = await prisma.notificacion.count({ where: { servicioId } });
    expect(count).toBe(0);
  });

  it("marcarTodasLeidas actualiza solo las del camarero indicado", async () => {
    const c1 = await insertarCamarero();
    const c2 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([c1, c2]);

    await cancelarUC.execute(servicioId);
    await avisos.marcarTodasLeidas(c1, new Date());

    const noLeidasC1 = await avisos.contarNoLeidas(c1);
    const noLeidasC2 = await avisos.contarNoLeidas(c2);
    expect(noLeidasC1).toBe(0);
    expect(noLeidasC2).toBe(1);
  });
});
