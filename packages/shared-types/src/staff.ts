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
