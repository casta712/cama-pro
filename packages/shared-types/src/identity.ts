import { z } from "zod";

export const RolUsuario = z.enum(["GESTOR", "CAMARERO"]);
export type RolUsuario = z.infer<typeof RolUsuario>;

export const EstadoCuentaCamarero = z.enum([
  "PENDIENTE_APROBACION",
  "ACTIVO",
  "SUSPENDIDO",
]);
export type EstadoCuentaCamarero = z.infer<typeof EstadoCuentaCamarero>;

export const RegistrarCamareroInput = z.object({
  nombre: z.string().min(2).max(80),
  email: z.string().email(),
  telefono: z.string().min(6).max(20),
  password: z.string().min(8).max(72),
  bio: z.string().trim().min(30).max(1000),
});
export type RegistrarCamareroInput = z.infer<typeof RegistrarCamareroInput>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const UsuarioDTO = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  rol: RolUsuario,
  camareroId: z.string().uuid().nullable(),
});
export type UsuarioDTO = z.infer<typeof UsuarioDTO>;
