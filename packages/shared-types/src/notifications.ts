import { z } from "zod";
import { TipoEvento } from "./bookings.js";

export const TipoNotificacion = z.enum([
  "SERVICIO_CANCELADO",
  "SERVICIO_EDITADO",
]);
export type TipoNotificacion = z.infer<typeof TipoNotificacion>;

/** Snapshot del servicio congelado en el momento de emitirse el aviso. */
export const ServicioSnapshot = z.object({
  lugar: z.string(),
  fechaInicio: z.string().datetime(),
  duracionHoras: z.number().int(),
});
export type ServicioSnapshot = z.infer<typeof ServicioSnapshot>;

const CambioTexto = z.object({
  antes: z.string(),
  despues: z.string(),
});
const CambioTextoNullable = z.object({
  antes: z.string().nullable(),
  despues: z.string().nullable(),
});

export const PayloadServicioCancelado = z.object({
  servicio: ServicioSnapshot,
});
export type PayloadServicioCancelado = z.infer<typeof PayloadServicioCancelado>;

export const CambiosEdicion = z.object({
  tipoEvento: z
    .object({ antes: TipoEvento, despues: TipoEvento })
    .optional(),
  uniforme: CambioTextoNullable.optional(),
  notas: CambioTextoNullable.optional(),
});
export type CambiosEdicion = z.infer<typeof CambiosEdicion>;

export const PayloadServicioEditado = z.object({
  servicio: ServicioSnapshot,
  cambios: CambiosEdicion,
});
export type PayloadServicioEditado = z.infer<typeof PayloadServicioEditado>;

const camposComunes = {
  id: z.string().uuid(),
  servicioId: z.string().uuid(),
  leidaEn: z.string().datetime().nullable(),
  creadaEn: z.string().datetime(),
};

// Union discriminada por `tipo`: el front puede hacer narrow con un solo
// `if (a.tipo === "SERVICIO_EDITADO")` y acceder a `a.payload.cambios`
// con tipos correctos, sin guards manuales.
export const NotificacionDTO = z.discriminatedUnion("tipo", [
  z.object({
    ...camposComunes,
    tipo: z.literal("SERVICIO_CANCELADO"),
    payload: PayloadServicioCancelado,
  }),
  z.object({
    ...camposComunes,
    tipo: z.literal("SERVICIO_EDITADO"),
    payload: PayloadServicioEditado,
  }),
]);
export type NotificacionDTO = z.infer<typeof NotificacionDTO>;

export const ListarAvisosResponse = z.object({
  items: z.array(NotificacionDTO),
});
export type ListarAvisosResponse = z.infer<typeof ListarAvisosResponse>;

export const ContarNoLeidosResponse = z.object({
  total: z.number().int().nonnegative(),
});
export type ContarNoLeidosResponse = z.infer<typeof ContarNoLeidosResponse>;

