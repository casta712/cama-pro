import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Servicio } from "../../bookings/domain/Servicio.js";
import { PrismaServicioRepository } from "../../bookings/infrastructure/PrismaServicioRepository.js";
import { CancelarServicio } from "../../bookings/application/CancelarServicio.js";
import { EditarServicio } from "../../bookings/application/EditarServicio.js";
import { LiberarAsignacion } from "../../bookings/application/LiberarAsignacion.js";
import { PrismaNotificacionRepository } from "../infrastructure/PrismaNotificacionRepository.js";
import { NotificadorDeCambioServicioEnDB } from "../infrastructure/NotificadorDeCambioServicioEnDB.js";
import { NotificadorDeMovimientoAsignacionEnDB } from "../infrastructure/NotificadorDeMovimientoAsignacionEnDB.js";
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

// Resolvers reales sobre BD: validan que la cadena cross-context
// (camareroId -> usuarioId, rol -> usuarioIds) funcione end-to-end.
const resolverUsuariosDeCamareros = async (
  ids: ReadonlyArray<string>,
): Promise<Map<string, string>> => {
  if (ids.length === 0) return new Map();
  const rows = await prisma.usuario.findMany({
    where: { camareroId: { in: [...ids] } },
    select: { id: true, camareroId: true },
  });
  const m = new Map<string, string>();
  for (const r of rows) if (r.camareroId) m.set(r.camareroId, r.id);
  return m;
};
const listarGestorUsuarioIds = async (): Promise<string[]> => {
  const rows = await prisma.usuario.findMany({
    where: { rol: "GESTOR" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
};

const notificador = new NotificadorDeCambioServicioEnDB(
  avisos,
  resolverUsuariosDeCamareros,
);
const notificadorMovimiento = new NotificadorDeMovimientoAsignacionEnDB(
  avisos,
  listarGestorUsuarioIds,
);
const cancelarUC = new CancelarServicio(servicios, notificador);
const editarUC = new EditarServicio(servicios, notificador);
const liberarUC = new LiberarAsignacion(
  servicios,
  notificadorMovimiento,
  async (ids) => {
    const rows = await prisma.camarero.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, nombre: true, email: true, telefono: true },
    });
    return rows;
  },
);

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await disconnectTestPrisma();
});

interface CamareroCreado {
  camareroId: string;
  usuarioId: string;
  nombre: string;
}

async function insertarCamarero(nombre?: string): Promise<CamareroCreado> {
  const camareroId = randomUUID();
  const usuarioId = randomUUID();
  const nombreFinal = nombre ?? `Camarero ${camareroId.slice(0, 4)}`;
  await prisma.camarero.create({
    data: {
      id: camareroId,
      nombre: nombreFinal,
      email: `${camareroId.slice(0, 8)}@test.local`,
      telefono: "600000000",
      bio: BIO_MIN,
      estadoCuenta: "ACTIVO",
    },
  });
  await prisma.usuario.create({
    data: {
      id: usuarioId,
      email: `${camareroId.slice(0, 8)}-user@test.local`,
      passwordHash: "x",
      rol: "CAMARERO",
      camareroId,
    },
  });
  return { camareroId, usuarioId, nombre: nombreFinal };
}

async function insertarGestor(): Promise<string> {
  const id = randomUUID();
  await prisma.usuario.create({
    data: {
      id,
      email: `${id.slice(0, 8)}-gestor@test.local`,
      passwordHash: "x",
      rol: "GESTOR",
    },
  });
  return id;
}

async function insertarServicioConAsignaciones(
  camareroIds: string[],
  opts: { uniforme?: string; notas?: string; exactoCuposTotales?: number } = {},
): Promise<string> {
  // Por defecto +1 sobre los asignados para que el servicio quede en
  // PUBLICADO. Se puede pedir exacto para forzar CUBIERTO.
  const cuposTotales = opts.exactoCuposTotales ?? camareroIds.length + 1;
  const s = Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel Test", direccion: "Calle Test 1" },
    tipoEvento: "BODA",
    cuposTotales,
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
  it("cancelar un servicio con dos asignados crea dos avisos no leidos por usuarioId", async () => {
    const c1 = await insertarCamarero();
    const c2 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([
      c1.camareroId,
      c2.camareroId,
    ]);

    await cancelarUC.execute(servicioId);

    const rows = await prisma.notificacion.findMany({ where: { servicioId } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tipo === "SERVICIO_CANCELADO")).toBe(true);
    expect(rows.every((r) => r.leidaEn === null)).toBe(true);
    const usuarioIds = rows.map((r) => r.usuarioId).sort();
    expect(usuarioIds).toEqual([c1.usuarioId, c2.usuarioId].sort());
  });

  it("cancelar un servicio sin asignados no crea avisos", async () => {
    const servicioId = await insertarServicioConAsignaciones([]);

    await cancelarUC.execute(servicioId);

    const count = await prisma.notificacion.count({ where: { servicioId } });
    expect(count).toBe(0);
  });

  it("editar uniforme con asignados crea avisos con el delta correcto", async () => {
    const c1 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([c1.camareroId], {
      uniforme: "Negro",
    });

    await editarUC.execute({ id: servicioId, uniforme: "Blanco" });

    const rows = await prisma.notificacion.findMany({ where: { servicioId } });
    expect(rows).toHaveLength(1);
    const aviso = rows[0]!;
    expect(aviso.usuarioId).toBe(c1.usuarioId);
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
    const servicioId = await insertarServicioConAsignaciones([c1.camareroId], {
      uniforme: "Negro",
    });

    await editarUC.execute({ id: servicioId, uniforme: "Negro" });

    const count = await prisma.notificacion.count({ where: { servicioId } });
    expect(count).toBe(0);
  });

  it("marcarTodasLeidas actualiza solo las del usuario indicado", async () => {
    const c1 = await insertarCamarero();
    const c2 = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([
      c1.camareroId,
      c2.camareroId,
    ]);

    await cancelarUC.execute(servicioId);
    await avisos.marcarTodasLeidas(c1.usuarioId, new Date());

    const noLeidasU1 = await avisos.contarNoLeidas(c1.usuarioId);
    const noLeidasU2 = await avisos.contarNoLeidas(c2.usuarioId);
    expect(noLeidasU1).toBe(0);
    expect(noLeidasU2).toBe(1);
  });

  it("liberar una asignacion notifica a todos los gestores con el actor en payload", async () => {
    const g1 = await insertarGestor();
    const g2 = await insertarGestor();
    const bob = await insertarCamarero("Bob");
    const servicioId = await insertarServicioConAsignaciones([bob.camareroId]);

    await liberarUC.execute({ servicioId, camareroId: bob.camareroId });

    const rows = await prisma.notificacion.findMany({
      where: { servicioId, tipo: "SERVICIO_LIBERADO" },
    });
    expect(rows).toHaveLength(2);
    const usuarioIds = rows.map((r) => r.usuarioId).sort();
    expect(usuarioIds).toEqual([g1, g2].sort());
    const payload = rows[0]!.payload as {
      camarero: { id: string; nombre: string };
    };
    expect(payload.camarero).toEqual({ id: bob.camareroId, nombre: "Bob" });
  });

  it("liberar borra fisicamente la asignacion y revierte el servicio a PUBLICADO si estaba CUBIERTO", async () => {
    await insertarGestor();
    const bob = await insertarCamarero();
    // exactoCuposTotales = 1 -> el servicio queda CUBIERTO tras la aceptacion
    const servicioId = await insertarServicioConAsignaciones(
      [bob.camareroId],
      { exactoCuposTotales: 1 },
    );
    const antes = await prisma.servicio.findUniqueOrThrow({
      where: { id: servicioId },
    });
    expect(antes.estado).toBe("CUBIERTO");

    await liberarUC.execute({ servicioId, camareroId: bob.camareroId });

    const despues = await prisma.servicio.findUniqueOrThrow({
      where: { id: servicioId },
    });
    expect(despues.estado).toBe("PUBLICADO");
    const asignaciones = await prisma.asignacion.findMany({
      where: { servicioId },
    });
    expect(asignaciones).toHaveLength(0);
  });

  it("liberar sin gestores en el sistema no crea avisos pero no falla", async () => {
    const bob = await insertarCamarero();
    const servicioId = await insertarServicioConAsignaciones([bob.camareroId]);

    await liberarUC.execute({ servicioId, camareroId: bob.camareroId });

    const count = await prisma.notificacion.count({
      where: { servicioId, tipo: "SERVICIO_LIBERADO" },
    });
    expect(count).toBe(0);
    const asignaciones = await prisma.asignacion.count({ where: { servicioId } });
    expect(asignaciones).toBe(0);
  });
});
