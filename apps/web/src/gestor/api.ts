import type {
  AsignacionConCamareroDTO,
  CamareroDTO,
  CrearServicioInput,
  EditarServicioInput,
  EstadoCuentaCamarero,
  EstadoServicio,
  ServicioDTO,
} from "@cama-pro/shared-types";
import { apiRequest } from "../shared/fetchClient.js";

export function listarServiciosGestor(estado?: EstadoServicio): Promise<ServicioDTO[]> {
  const qs = estado ? `?estado=${estado}` : "";
  return apiRequest<ServicioDTO[]>(`/api/servicios${qs}`);
}

export function crearServicio(input: CrearServicioInput): Promise<ServicioDTO> {
  return apiRequest<ServicioDTO>("/api/servicios", { method: "POST", body: input });
}

export function editarServicio(
  id: string,
  cambios: EditarServicioInput,
): Promise<ServicioDTO> {
  return apiRequest<ServicioDTO>(`/api/servicios/${id}`, {
    method: "PATCH",
    body: cambios,
  });
}

export function cancelarServicio(id: string): Promise<ServicioDTO> {
  return apiRequest<ServicioDTO>(`/api/servicios/${id}/cancelar`, { method: "POST" });
}

export function listarAsignacionesServicio(id: string): Promise<AsignacionConCamareroDTO[]> {
  return apiRequest<AsignacionConCamareroDTO[]>(`/api/servicios/${id}/asignaciones`);
}

export function listarCamareros(estado?: EstadoCuentaCamarero): Promise<CamareroDTO[]> {
  const qs = estado ? `?estado=${estado}` : "";
  return apiRequest<CamareroDTO[]>(`/api/camareros${qs}`);
}

export function aprobarCamarero(id: string): Promise<CamareroDTO> {
  return apiRequest<CamareroDTO>(`/api/camareros/${id}/aprobar`, { method: "POST" });
}

export function suspenderCamarero(id: string): Promise<CamareroDTO> {
  return apiRequest<CamareroDTO>(`/api/camareros/${id}/suspender`, { method: "POST" });
}
