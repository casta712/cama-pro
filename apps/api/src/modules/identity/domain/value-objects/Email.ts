import { EmailInvalidoError } from "../errors/IdentityErrors.js";

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(public readonly value: string) {}

  static of(raw: string): Email {
    const normalizado = raw.trim().toLowerCase();
    if (!FORMATO.test(normalizado)) {
      throw new EmailInvalidoError(raw);
    }
    return new Email(normalizado);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
