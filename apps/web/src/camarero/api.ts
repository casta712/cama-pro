import type { ServicioDTO } from "@cama-pro/shared-types";
import { apiRequest } from "../shared/fetchClient.js";

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
