import type { ServicioRef } from "./NotificadorDeCambioServicio.js";

/**
 * Contrato cross-context: bookings emite por aqui los eventos sobre
 * asignaciones que le interesan al gestor (no al camarero). Hoy solo
 * cubrimos liberar; cuando agreguemos aceptar/rechazar-completo, encajan
 * en el mismo puerto.
 *
 * El destinatario (gestor) lo resuelve el implementador via identity;
 * bookings no conoce gestores ni Usuarios.
 */
export interface NotificarLiberacionInput {
  readonly servicioId: string;
  readonly servicio: ServicioRef;
  readonly camareroId: string;
  /** Nombre del camarero para mostrar al gestor sin segunda llamada. */
  readonly camareroNombre: string;
}

export interface NotificadorDeMovimientoAsignacion {
  notificarLiberacion(input: NotificarLiberacionInput): Promise<void>;
}
