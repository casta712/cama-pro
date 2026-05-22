import bcrypt from "bcrypt";
import type { PasswordHasher } from "../domain/ports/PasswordHasher.js";

const ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, ROUNDS);
  }

  verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
