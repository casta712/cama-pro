import type {
  CamareroDTO,
  EditarPerfilCamareroInput,
  ServicioDTO,
} from "@cama-pro/shared-types";
import { ApiError, apiRequest } from "../shared/fetchClient.js";

export function obtenerMiCamarero(): Promise<CamareroDTO> {
  return apiRequest<CamareroDTO>("/api/camareros/me");
}

export function editarMiCamarero(
  cambios: EditarPerfilCamareroInput,
): Promise<CamareroDTO> {
  return apiRequest<CamareroDTO>("/api/camareros/me", {
    method: "PATCH",
    body: cambios,
  });
}

export interface AceptarResponse {
  asignacion: {
    id: string;
    camareroId: string;
    servicioId: string;
    aceptadaEn: string;
  };
  servicio: ServicioDTO;
}

export function listarDisponibles(): Promise<ServicioDTO[]> {
  return apiRequest<ServicioDTO[]>("/api/servicios/disponibles");
}

export function listarMisAsignaciones(): Promise<ServicioDTO[]> {
  return apiRequest<ServicioDTO[]>("/api/servicios/mis-asignaciones");
}

export function aceptarServicio(id: string): Promise<AceptarResponse> {
  return apiRequest<AceptarResponse>(`/api/servicios/${id}/aceptar`, { method: "POST" });
}

/** Libera (abandona) la asignacion del camarero autenticado en el servicio. */
export function liberarMiAsignacion(id: string): Promise<void> {
  return apiRequest<void>(`/api/servicios/${id}/mi-asignacion`, {
    method: "DELETE",
  });
}

/**
 * Mensaje claro para el usuario al fallar `aceptarServicio`. Distingue por
 * `code` porque varios 409 representan situaciones muy distintas (otro
 * camarero llego antes vs. tienes un servicio solapado).
 */
export function mensajeErrorAceptar(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "CAMARERO_CON_SERVICIO_SOLAPADO") return err.message;
    if (
      err.status === 409 &&
      (err.code === "CONFLICTO_CONCURRENCIA" ||
        err.code === "CUPO_LLENO" ||
        err.code === "SERVICIO_NO_DISPONIBLE")
    ) {
      return "Otro camarero llego antes. Refresca la lista.";
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "No se pudo aceptar el servicio";
}
