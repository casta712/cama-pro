import { z } from "zod";
import { EstadoCuentaCamarero } from "./identity.js";

export { EstadoCuentaCamarero };

export const CamareroDTO = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  email: z.string().email(),
  telefono: z.string(),
  bio: z.string(),
  estadoCuenta: EstadoCuentaCamarero,
  creadoEn: z.string().datetime(),
});
export type CamareroDTO = z.infer<typeof CamareroDTO>;

export const ListarCamarerosQuery = z.object({
  estado: EstadoCuentaCamarero.optional(),
});
export type ListarCamarerosQuery = z.infer<typeof ListarCamarerosQuery>;

export const EditarPerfilCamareroInput = z
  .object({
    nombre: z.string().min(2).max(80).optional(),
    telefono: z.string().min(6).max(20).optional(),
    bio: z.string().trim().min(30).max(1000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Debes incluir al menos un campo a modificar",
  });
export type EditarPerfilCamareroInput = z.infer<typeof EditarPerfilCamareroInput>;
