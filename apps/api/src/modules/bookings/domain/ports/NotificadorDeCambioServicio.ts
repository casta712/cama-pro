/**
 * Contrato cross-context: bookings declara aqui que cuando cambian
 * servicios con asignaciones necesita "decirselo a alguien". Quien lo
 * implementa es asunto del wiring (en MVP, el modulo notifications).
 *
 * Tipos primitivos a proposito: no se filtra la entidad Servicio fuera
 * del contexto bookings. El implementador recibe lo justo para componer
 * el aviso.
 */
export interface ServicioRef {
  readonly lugar: string;
  readonly fechaInicio: Date;
  readonly duracionHoras: number;
}

export interface CambioCampo<T> {
  readonly antes: T;
  readonly despues: T;
}

export interface CambiosBlandos {
  readonly tipoEvento?: CambioCampo<string>;
  readonly uniforme?: CambioCampo<string | null>;
  readonly notas?: CambioCampo<string | null>;
}

export interface NotificarCancelacionInput {
  readonly servicioId: string;
  readonly camareroIds: ReadonlyArray<string>;
  readonly servicio: ServicioRef;
}

export interface NotificarEdicionInput {
  readonly servicioId: string;
  readonly camareroIds: ReadonlyArray<string>;
  readonly servicio: ServicioRef;
  readonly cambios: CambiosBlandos;
}

export interface NotificadorDeCambioServicio {
  notificarCancelacion(input: NotificarCancelacionInput): Promise<void>;
  notificarEdicion(input: NotificarEdicionInput): Promise<void>;
}
