import type { ServicioDTO } from "@cama-pro/shared-types";
import { apiRequest } from "./fetchClient.js";

/** Detalle de un servicio. Accesible a gestor y camarero autenticados. */
export function obtenerServicio(id: string): Promise<ServicioDTO> {
  return apiRequest<ServicioDTO>(`/api/servicios/${id}`);
}
