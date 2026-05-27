import { describe, expect, it } from "vitest";
import { Notificacion } from "../domain/Notificacion.js";

const SNAPSHOT = {
  lugar: "Hotel X",
  fechaInicio: new Date(Date.UTC(2026, 5, 1, 18)).toISOString(),
  duracionHoras: 4,
};

describe("Notificacion (agregado)", () => {
  it("se crea no leida con tipo SERVICIO_CANCELADO", () => {
    const n = Notificacion.crearCancelacion({
      id: "n1",
      usuarioId: "u1",
      servicioId: "s1",
      payload: { servicio: SNAPSHOT },
    });
    expect(n.tipo).toBe("SERVICIO_CANCELADO");
    expect(n.estaLeida).toBe(false);
    expect(n.leidaEn).toBeNull();
  });

  it("se crea no leida con tipo SERVICIO_EDITADO y conserva los cambios", () => {
    const n = Notificacion.crearEdicion({
      id: "n2",
      usuarioId: "u1",
      servicioId: "s1",
      payload: {
        servicio: SNAPSHOT,
        cambios: { uniforme: { antes: "Negro", despues: "Blanco" } },
      },
    });
    expect(n.tipo).toBe("SERVICIO_EDITADO");
    const payload = n.payload as { cambios: { uniforme?: { despues: string } } };
    expect(payload.cambios.uniforme?.despues).toBe("Blanco");
  });

  it("se crea no leida con tipo SERVICIO_LIBERADO y conserva el actor camarero", () => {
    const n = Notificacion.crearLiberacion({
      id: "n3",
      usuarioId: "u-gestor",
      servicioId: "s1",
      payload: {
        servicio: SNAPSHOT,
        camarero: { id: "c-bob", nombre: "Bob" },
      },
    });
    expect(n.tipo).toBe("SERVICIO_LIBERADO");
    expect(n.estaLeida).toBe(false);
    const payload = n.payload as { camarero: { nombre: string } };
    expect(payload.camarero.nombre).toBe("Bob");
  });

  it("marcarLeida es idempotente: la segunda llamada no cambia leidaEn", () => {
    const n = Notificacion.crearCancelacion({
      id: "n1",
      usuarioId: "u1",
      servicioId: "s1",
      payload: { servicio: SNAPSHOT },
    });
    const t1 = new Date("2026-01-01T10:00:00Z");
    const t2 = new Date("2026-01-01T11:00:00Z");
    n.marcarLeida(t1);
    expect(n.leidaEn).toEqual(t1);
    n.marcarLeida(t2);
    expect(n.leidaEn).toEqual(t1); // no se sobrescribe
    expect(n.estaLeida).toBe(true);
  });
});
