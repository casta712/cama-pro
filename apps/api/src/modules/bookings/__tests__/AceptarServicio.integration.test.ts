import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConflictoConcurrenciaError, NotFoundError } from "../../../shared/errors/AppError.js";
import {
  CamareroNoActivoError,
  CupoLlenoError,
  ServicioYaEnCursoError,
  YaAsignadoError,
} from "../domain/errors/BookingsErrors.js";
import { Servicio } from "../domain/Servicio.js";
import { PrismaServicioRepository } from "../infrastructure/PrismaServicioRepository.js";
import { AceptarServicio, type VerificarCamareroFn } from "../application/AceptarServicio.js";
import {
  disconnectTestPrisma,
  getTestPrisma,
  resetDb,
} from "../../../../test-helpers/integrationDb.js";

const HORA_MS = 60 * 60 * 1000;
const BIO_MIN =
  "Soy camarero con experiencia en eventos y servicios de gran formato.";

const prisma = getTestPrisma();
const repo = new PrismaServicioRepository(prisma);

/** Versión real: consulta la tabla camareros en la BD de tests. */
const verificarCamareroReal: VerificarCamareroFn = async (camareroId) => {
  const row = await prisma.camarero.findUnique({
    where: { id: camareroId },
    select: { estadoCuenta: true },
  });
  return {
    puedeAceptarServicios: row?.estadoCuenta === "ACTIVO",
  };
};

const aceptarUC = new AceptarServicio(repo, verificarCamareroReal);

beforeEach(async () => {
  await resetDb(prisma);
});

afterAll(async () => {
  await disconnectTestPrisma();
});

async function insertarCamarero(estado: "PENDIENTE_APROBACION" | "ACTIVO" | "SUSPENDIDO"): Promise<string> {
  const id = randomUUID();
  await prisma.camarero.create({
    data: {
      id,
      nombre: `Camarero ${id.slice(0, 4)}`,
      email: `${id.slice(0, 8)}@test.local`,
      telefono: "600000000",
      bio: BIO_MIN,
      estadoCuenta: estado,
    },
  });
  return id;
}

async function insertarServicioFuturo(cuposTotales: number): Promise<string> {
  const servicio = Servicio.crear({
    id: randomUUID(),
    fechaInicio: new Date(Date.now() + 6 * HORA_MS),
    duracionHoras: 4,
    lugar: { nombre: "Hotel Test", direccion: "Calle Test 1" },
    tipoEvento: "BODA",
    cuposTotales,
  });
  await repo.save(servicio);
  return servicio.id;
}

describe("AceptarServicio (integración con Postgres)", () => {
  it("camino feliz: un camarero ACTIVO acepta un servicio publicado", async () => {
    const camareroId = await insertarCamarero("ACTIVO");
    const servicioId = await insertarServicioFuturo(2);

    const { asignacion, servicio } = await aceptarUC.execute({
      servicioId,
      camareroId,
    });

    expect(asignacion.camareroId).toBe(camareroId);
    expect(servicio.cuposOcupados).toBe(1);
    expect(servicio.estado).toBe("PUBLICADO");

    const row = await prisma.servicio.findUniqueOrThrow({
      where: { id: servicioId },
      include: { asignaciones: true },
    });
    expect(row.version).toBe(1);
    expect(row.estado).toBe("PUBLICADO");
    expect(row.asignaciones).toHaveLength(1);
    expect(row.asignaciones[0]!.camareroId).toBe(camareroId);
  });

  it("al cubrir el ultimo cupo, el servicio pasa a CUBIERTO en BD", async () => {
    const c1 = await insertarCamarero("ACTIVO");
    const c2 = await insertarCamarero("ACTIVO");
    const servicioId = await insertarServicioFuturo(2);

    await aceptarUC.execute({ servicioId, camareroId: c1 });
    await aceptarUC.execute({ servicioId, camareroId: c2 });

    const row = await prisma.servicio.findUniqueOrThrow({
      where: { id: servicioId },
    });
    expect(row.estado).toBe("CUBIERTO");
    expect(row.version).toBe(2);
  });

  it("el mismo camarero no puede aceptar dos veces (invariante de dominio)", async () => {
    const camareroId = await insertarCamarero("ACTIVO");
    const servicioId = await insertarServicioFuturo(3);

    await aceptarUC.execute({ servicioId, camareroId });
    await expect(
      aceptarUC.execute({ servicioId, camareroId }),
    ).rejects.toThrow(YaAsignadoError);

    const asignaciones = await prisma.asignacion.count({ where: { servicioId } });
    expect(asignaciones).toBe(1);
  });

  it("camarero PENDIENTE_APROBACION no puede aceptar", async () => {
    const camareroId = await insertarCamarero("PENDIENTE_APROBACION");
    const servicioId = await insertarServicioFuturo(1);

    await expect(
      aceptarUC.execute({ servicioId, camareroId }),
    ).rejects.toThrow(CamareroNoActivoError);

    const asignaciones = await prisma.asignacion.count({ where: { servicioId } });
    expect(asignaciones).toBe(0);
  });

  it("camarero SUSPENDIDO no puede aceptar", async () => {
    const camareroId = await insertarCamarero("SUSPENDIDO");
    const servicioId = await insertarServicioFuturo(1);

    await expect(
      aceptarUC.execute({ servicioId, camareroId }),
    ).rejects.toThrow(CamareroNoActivoError);
  });

  it("servicio inexistente -> NotFoundError", async () => {
    const camareroId = await insertarCamarero("ACTIVO");
    await expect(
      aceptarUC.execute({ servicioId: randomUUID(), camareroId }),
    ).rejects.toThrow(NotFoundError);
  });

  it("servicio cuya hora de inicio ya paso -> ServicioYaEnCursoError", async () => {
    const camareroId = await insertarCamarero("ACTIVO");
    const servicioId = await insertarServicioFuturo(2);
    // Movemos fechaInicio al pasado por SQL para simular "ya en curso" sin
    // saltarnos la invariante del agregado al crear.
    await prisma.servicio.update({
      where: { id: servicioId },
      data: { fechaInicio: new Date(Date.now() - HORA_MS) },
    });

    await expect(
      aceptarUC.execute({ servicioId, camareroId }),
    ).rejects.toThrow(ServicioYaEnCursoError);
  });

  describe("concurrencia (bloqueo optimista)", () => {
    it("dos camareros aceptando el ULTIMO cupo: uno gana, el otro falla", async () => {
      const c1 = await insertarCamarero("ACTIVO");
      const c2 = await insertarCamarero("ACTIVO");
      const servicioId = await insertarServicioFuturo(1);

      const resultados = await Promise.allSettled([
        aceptarUC.execute({ servicioId, camareroId: c1 }),
        aceptarUC.execute({ servicioId, camareroId: c2 }),
      ]);

      const cumplidos = resultados.filter((r) => r.status === "fulfilled");
      const rechazados = resultados.filter((r) => r.status === "rejected");

      expect(cumplidos).toHaveLength(1);
      expect(rechazados).toHaveLength(1);

      const motivo = (rechazados[0] as PromiseRejectedResult).reason as Error;
      // El conflicto puede manifestarse como version-mismatch (ConflictoConcurrenciaError)
      // o como CupoLleno si el segundo lee despues del primer save (rara vez con paralelismo
      // real). Ambos son resultados validos del bloqueo optimista; cualquier otro error es bug.
      expect(
        motivo instanceof ConflictoConcurrenciaError ||
          motivo instanceof CupoLlenoError,
      ).toBe(true);

      const row = await prisma.servicio.findUniqueOrThrow({
        where: { id: servicioId },
        include: { asignaciones: true },
      });
      expect(row.asignaciones).toHaveLength(1);
      expect(row.version).toBe(1);
      expect(row.estado).toBe("CUBIERTO");
    });

    it("diez camareros sobre 3 cupos: nunca hay sobreasignacion", async () => {
      // El bloqueo optimista NO garantiza que se cubran todos los cupos en
      // una unica rafaga sin reintentos: garantiza que NUNCA habra mas
      // asignaciones que `cuposTotales`. Cubrirlos completamente es trabajo
      // del cliente (reintentar tras ConflictoConcurrenciaError).
      const camareros = await Promise.all(
        Array.from({ length: 10 }, () => insertarCamarero("ACTIVO")),
      );
      const servicioId = await insertarServicioFuturo(3);

      const resultados = await Promise.allSettled(
        camareros.map((camareroId) =>
          aceptarUC.execute({ servicioId, camareroId }),
        ),
      );

      const cumplidos = resultados.filter((r) => r.status === "fulfilled");
      expect(cumplidos.length).toBeGreaterThanOrEqual(1);
      expect(cumplidos.length).toBeLessThanOrEqual(3);

      for (const r of resultados) {
        if (r.status === "rejected") {
          const e = r.reason as Error;
          expect(e.name).toMatch(
            /ConflictoConcurrencia|CupoLleno|ServicioNoDisponible/,
          );
        }
      }

      const row = await prisma.servicio.findUniqueOrThrow({
        where: { id: servicioId },
        include: { asignaciones: true },
      });
      expect(row.asignaciones.length).toBe(cumplidos.length);
      expect(row.asignaciones.length).toBeLessThanOrEqual(3);
      expect(row.version).toBe(cumplidos.length);
    });
  });
});
