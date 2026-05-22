import type { Rol } from "../Usuario.js";

export interface TokenPayload {
  sub: string;
  rol: Rol;
  camareroId: string | null;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
