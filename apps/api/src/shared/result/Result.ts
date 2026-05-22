/**
 * Result<T, E> — alternativa a excepciones para flujos donde el "fallo" es esperado.
 * Uso recomendado en casos de uso con multiples salidas no excepcionales.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
