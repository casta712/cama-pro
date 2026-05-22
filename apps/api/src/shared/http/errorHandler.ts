import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "../errors/DomainError.js";
import {
  AppError,
  ConflictoConcurrenciaError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDACION",
      detalles: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.httpStatus).json({ error: err.code, mensaje: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: "NO_ENCONTRADO", mensaje: err.message });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: "NO_AUTORIZADO", mensaje: err.message });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: "PROHIBIDO", mensaje: err.message });
    return;
  }

  if (err instanceof ConflictoConcurrenciaError) {
    res.status(409).json({ error: "CONFLICTO_CONCURRENCIA", mensaje: err.message });
    return;
  }

  if (err instanceof AppError) {
    res.status(500).json({ error: "ERROR_INTERNO", mensaje: err.message });
    return;
  }

  // Error desconocido — no exponer detalles al cliente.
  // eslint-disable-next-line no-console
  console.error("Error no manejado:", err);
  res.status(500).json({ error: "ERROR_INTERNO" });
};
