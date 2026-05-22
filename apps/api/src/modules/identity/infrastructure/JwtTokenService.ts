import jwt, { type SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type {
  TokenPayload,
  TokenService,
} from "../domain/ports/TokenService.js";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: TokenPayload): string {
    const opts: SignOptions = { expiresIn: this.expiresIn as SignOptions["expiresIn"] };
    return jwt.sign(payload, this.secret, opts);
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        typeof (decoded as { sub?: unknown }).sub !== "string"
      ) {
        throw new UnauthorizedError("Token con payload invalido");
      }
      const d = decoded as Record<string, unknown>;
      if (d.rol !== "GESTOR" && d.rol !== "CAMARERO") {
        throw new UnauthorizedError("Token con rol invalido");
      }
      return {
        sub: d.sub as string,
        rol: d.rol,
        camareroId: typeof d.camareroId === "string" ? d.camareroId : null,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError("Token invalido o expirado");
    }
  }
}
