import { z } from "zod";

export const EstadoServicio = z.enum([
  "PUBLICADO",
  "CUBIERTO",
  "EN_CURSO",
  "FINALIZADO",
  "CANCELADO",
]);
export type EstadoServicio = z.infer<typeof EstadoServicio>;

export const TipoEvento = z.enum([
  "BODA",
  "CORPORATIVO",
  "CENA_PRIVADA",
  "COCTEL",
  "BANQUETE",
  "OTRO",
]);
export type TipoEvento = z.infer<typeof TipoEvento>;

export const Lugar = z.object({
  nombre: z.string().min(1).max(120),
  direccion: z.string().min(1).max(200),
});
export type Lugar = z.infer<typeof Lugar>;

export const CrearServicioInput = z.object({
  fechaInicio: z.string().datetime(),
  duracionHoras: z.number().int().min(1).max(24),
  lugar: Lugar,
  tipoEvento: TipoEvento,
  cuposTotales: z.number().int().min(1).max(200),
  uniforme: z.string().max(200).optional(),
  notas: z.string().max(1000).optional(),
});
export type CrearServicioInput = z.infer<typeof CrearServicioInput>;

export const ServicioDTO = z.object({
  id: z.string().uuid(),
  fechaInicio: z.string().datetime(),
  duracionHoras: z.number(),
  lugar: Lugar,
  tipoEvento: TipoEvento,
  cuposTotales: z.number(),
  cuposOcupados: z.number(),
  uniforme: z.string().nullable(),
  notas: z.string().nullable(),
  estado: EstadoServicio,
  yaAceptado: z.boolean().optional(),
});
export type ServicioDTO = z.infer<typeof ServicioDTO>;
