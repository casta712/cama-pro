/**
 * Cliente HTTP minimo con bearer token opcional y manejo coherente de errores.
 * Se mantiene fuera de cualquier modulo de dominio: solo conoce HTTP.
 */

const TOKEN_KEY = "cama-pro.token";

export function leerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function guardarToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function borrarToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ApiError";
  }
}

interface ErrorPayload {
  error?: string | { message?: string; code?: string };
  mensaje?: string;
  detalles?: Record<string, string[] | undefined>;
  message?: string;
  code?: string;
}

function formatearDetalles(detalles: Record<string, string[] | undefined>): string {
  return Object.entries(detalles)
    .map(([campo, msgs]) => `${campo}: ${(msgs ?? []).join(", ")}`)
    .join("; ");
}

async function extraerError(res: Response): Promise<ApiError> {
  let payload: ErrorPayload | null = null;
  try {
    payload = (await res.json()) as ErrorPayload;
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  const errField = payload?.error;
  const codigo =
    typeof errField === "string"
      ? errField
      : typeof errField === "object"
        ? errField.code
        : payload?.code;

  const mensajeObj = typeof errField === "object" ? errField.message : undefined;
  const detallesStr =
    payload?.detalles && Object.keys(payload.detalles).length > 0
      ? formatearDetalles(payload.detalles)
      : undefined;

  const mensaje =
    payload?.mensaje ??
    mensajeObj ??
    payload?.message ??
    detallesStr ??
    res.statusText ??
    `Error ${res.status}`;

  return new ApiError(res.status, codigo, mensaje);
}

export interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const token = leerToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    throw await extraerError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
