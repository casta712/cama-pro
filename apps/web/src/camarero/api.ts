import type {
  CamareroDTO,
  EditarPerfilCamareroInput,
  ServicioDTO,
} from "@cama-pro/shared-types";
import { apiRequest } from "../shared/fetchClient.js";

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
