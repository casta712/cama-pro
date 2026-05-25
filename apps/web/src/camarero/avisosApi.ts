import type {
  ContarNoLeidosResponse,
  ListarAvisosResponse,
  NotificacionDTO,
} from "@cama-pro/shared-types";
import { apiRequest } from "../shared/fetchClient.js";

export async function listarMisAvisos(): Promise<NotificacionDTO[]> {
  const res = await apiRequest<ListarAvisosResponse>("/api/avisos");
  return res.items;
}

export function contarMisAvisosNoLeidos(): Promise<ContarNoLeidosResponse> {
  return apiRequest<ContarNoLeidosResponse>("/api/avisos/no-leidos/count");
}

export function marcarAvisoLeido(id: string): Promise<void> {
  return apiRequest<void>(`/api/avisos/${id}/leer`, { method: "PATCH" });
}

export function marcarTodosAvisosLeidos(): Promise<void> {
  return apiRequest<void>("/api/avisos/leer-todos", { method: "POST" });
}
