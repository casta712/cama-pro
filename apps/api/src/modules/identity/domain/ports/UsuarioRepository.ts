import type { Rol, Usuario } from "../Usuario.js";
import type { Email } from "../value-objects/Email.js";

export interface UsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: Email): Promise<Usuario | null>;
  existeEmail(email: Email): Promise<boolean>;
  save(usuario: Usuario): Promise<void>;
  /**
   * Devuelve los ids (Usuario.id) de todos los usuarios con el rol dado.
   * Usado por el notificador de eventos al gestor para resolver
   * destinatarios sin acoplarse al esquema de identity.
   */
  listarIdsPorRol(rol: Rol): Promise<string[]>;
  /**
   * Map camareroId -> usuarioId para un batch de camareros. Si algun
   * camareroId no tiene Usuario asociado (caso raro), se omite del mapa.
   */
  resolverUsuariosDeCamareros(
    camareroIds: ReadonlyArray<string>,
  ): Promise<Map<string, string>>;
}
