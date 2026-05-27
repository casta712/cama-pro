export type TipoNotificacion =
  | "SERVICIO_CANCELADO"
  | "SERVICIO_EDITADO"
  | "SERVICIO_LIBERADO";

/**
 * Snapshot minimo del servicio para que el destinatario entienda de cual se
 * trata sin tener que abrir el detalle (lugar, cuando). Se copia en el
 * payload porque la notificacion debe ser legible aunque el servicio se
 * borre o cambie a futuro.
 */
export interface ServicioSnapshot {
  readonly lugar: string;
  readonly fechaInicio: string; // ISO 8601
  readonly duracionHoras: number;
}

export interface ActorCamarero {
  readonly id: string;
  readonly nombre: string;
}

export interface PayloadServicioCancelado {
  readonly servicio: ServicioSnapshot;
}

export interface CambioCampo<T> {
  readonly antes: T;
  readonly despues: T;
}

/**
 * Solo los campos que cambiaron aparecen aqui. La edicion solo permite
 * cambios blandos cuando hay asignaciones — fechaInicio / lugar /
 * duracionHoras / cuposTotales nunca llegan aqui en MVP.
 */
export interface CambiosEdicion {
  readonly tipoEvento?: CambioCampo<string>;
  readonly uniforme?: CambioCampo<string | null>;
  readonly notas?: CambioCampo<string | null>;
}

export interface PayloadServicioEditado {
  readonly servicio: ServicioSnapshot;
  readonly cambios: CambiosEdicion;
}

/**
 * Aviso al gestor: un camarero abandono una asignacion previamente aceptada.
 * El payload lleva el actor (camarero) ademas del snapshot del servicio.
 */
export interface PayloadServicioLiberado {
  readonly servicio: ServicioSnapshot;
  readonly camarero: ActorCamarero;
}

export type PayloadNotificacion =
  | PayloadServicioCancelado
  | PayloadServicioEditado
  | PayloadServicioLiberado;

interface NotificacionProps {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  servicioId: string;
  payload: PayloadNotificacion;
  leidaEn: Date | null;
  creadaEn: Date;
}

/**
 * Agregado Notificacion. Trivial: solo encapsula la transicion
 * no-leida -> leida (idempotente). El contenido es inmutable; el avisador
 * cross-context crea instancias completas con las factories.
 *
 * El destinatario es un Usuario (cualquier rol). Para avisos a camareros,
 * usuarioId apunta al Usuario.id del camarero (no a Camarero.id). Para
 * avisos al gestor, apunta al Usuario.id de un gestor.
 */
export class Notificacion {
  private constructor(private readonly props: NotificacionProps) {}

  static crearCancelacion(input: {
    id: string;
    usuarioId: string;
    servicioId: string;
    payload: PayloadServicioCancelado;
    creadaEn?: Date;
  }): Notificacion {
    return new Notificacion({
      id: input.id,
      usuarioId: input.usuarioId,
      tipo: "SERVICIO_CANCELADO",
      servicioId: input.servicioId,
      payload: input.payload,
      leidaEn: null,
      creadaEn: input.creadaEn ?? new Date(),
    });
  }

  static crearEdicion(input: {
    id: string;
    usuarioId: string;
    servicioId: string;
    payload: PayloadServicioEditado;
    creadaEn?: Date;
  }): Notificacion {
    return new Notificacion({
      id: input.id,
      usuarioId: input.usuarioId,
      tipo: "SERVICIO_EDITADO",
      servicioId: input.servicioId,
      payload: input.payload,
      leidaEn: null,
      creadaEn: input.creadaEn ?? new Date(),
    });
  }

  static crearLiberacion(input: {
    id: string;
    usuarioId: string;
    servicioId: string;
    payload: PayloadServicioLiberado;
    creadaEn?: Date;
  }): Notificacion {
    return new Notificacion({
      id: input.id,
      usuarioId: input.usuarioId,
      tipo: "SERVICIO_LIBERADO",
      servicioId: input.servicioId,
      payload: input.payload,
      leidaEn: null,
      creadaEn: input.creadaEn ?? new Date(),
    });
  }

  static reconstituir(props: NotificacionProps): Notificacion {
    return new Notificacion({ ...props });
  }

  /**
   * Marca el aviso como leido. Idempotente: si ya estaba leido, no hace nada
   * (no lanza error). El gestor del estado leido es el usuario dueño, no
   * el agregado: la validacion de ownership la hace el caso de uso.
   */
  marcarLeida(ahora: Date = new Date()): void {
    if (this.props.leidaEn !== null) return;
    this.props.leidaEn = ahora;
  }

  get id(): string {
    return this.props.id;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get tipo(): TipoNotificacion {
    return this.props.tipo;
  }
  get servicioId(): string {
    return this.props.servicioId;
  }
  get payload(): PayloadNotificacion {
    return this.props.payload;
  }
  get leidaEn(): Date | null {
    return this.props.leidaEn;
  }
  get creadaEn(): Date {
    return this.props.creadaEn;
  }
  get estaLeida(): boolean {
    return this.props.leidaEn !== null;
  }
}
