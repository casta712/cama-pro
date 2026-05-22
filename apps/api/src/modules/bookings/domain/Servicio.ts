import {
  CupoLlenoError,
  CuposInvalidosError,
  DuracionInvalidaError,
  FechaInvalidaError,
  ServicioNoDisponibleError,
  TransicionEstadoInvalidaError,
  YaAsignadoError,
} from "./errors/BookingsErrors.js";

export type EstadoServicio =
  | "PUBLICADO"
  | "CUBIERTO"
  | "EN_CURSO"
  | "FINALIZADO"
  | "CANCELADO";

export type TipoEvento =
  | "BODA"
  | "CORPORATIVO"
  | "CENA_PRIVADA"
  | "COCTEL"
  | "BANQUETE"
  | "OTRO";

export interface Lugar {
  readonly nombre: string;
  readonly direccion: string;
}

export interface Asignacion {
  readonly id: string;
  readonly camareroId: string;
  readonly aceptadaEn: Date;
}

interface ServicioProps {
  id: string;
  fechaInicio: Date;
  duracionHoras: number;
  lugar: Lugar;
  tipoEvento: TipoEvento;
  cuposTotales: number;
  uniforme: string | null;
  notas: string | null;
  estado: EstadoServicio;
  version: number;
  creadoEn: Date;
  asignaciones: Asignacion[];
}

const MAX_CUPOS = 200;
const MAX_HORAS = 24;

/**
 * Agregado Servicio (raiz). Encapsula la maquina de estados y las
 * invariantes de cupos/asignaciones. Ver docs/dominio.md.
 *
 * Invariantes (protegidas por el agregado):
 *  - asignaciones.length <= cuposTotales (siempre).
 *  - Un mismo camareroId no aparece dos veces en asignaciones.
 *  - aceptar() solo valido si estado === PUBLICADO.
 *  - Al alcanzar cuposTotales, estado pasa a CUBIERTO automaticamente.
 *  - cancelar() valido desde PUBLICADO o CUBIERTO.
 *
 * Concurrencia: el campo `version` se usa para bloqueo optimista en el
 * repositorio. Cada modificacion del agregado incrementa la version
 * persistida.
 */
export class Servicio {
  private constructor(private readonly props: ServicioProps) {}

  static crear(input: {
    id: string;
    fechaInicio: Date;
    duracionHoras: number;
    lugar: Lugar;
    tipoEvento: TipoEvento;
    cuposTotales: number;
    uniforme?: string;
    notas?: string;
    ahora?: Date;
  }): Servicio {
    const ahora = input.ahora ?? new Date();

    if (input.fechaInicio.getTime() <= ahora.getTime()) {
      throw new FechaInvalidaError();
    }
    if (
      !Number.isInteger(input.duracionHoras) ||
      input.duracionHoras < 1 ||
      input.duracionHoras > MAX_HORAS
    ) {
      throw new DuracionInvalidaError();
    }
    if (
      !Number.isInteger(input.cuposTotales) ||
      input.cuposTotales < 1 ||
      input.cuposTotales > MAX_CUPOS
    ) {
      throw new CuposInvalidosError();
    }

    return new Servicio({
      id: input.id,
      fechaInicio: input.fechaInicio,
      duracionHoras: input.duracionHoras,
      lugar: input.lugar,
      tipoEvento: input.tipoEvento,
      cuposTotales: input.cuposTotales,
      uniforme: input.uniforme?.trim() || null,
      notas: input.notas?.trim() || null,
      estado: "PUBLICADO",
      version: 0,
      creadoEn: ahora,
      asignaciones: [],
    });
  }

  static reconstituir(props: ServicioProps): Servicio {
    return new Servicio({
      ...props,
      asignaciones: [...props.asignaciones],
    });
  }

  aceptar(input: {
    camareroId: string;
    asignacionId: string;
    ahora?: Date;
  }): Asignacion {
    if (this.props.estado !== "PUBLICADO") {
      throw new ServicioNoDisponibleError(this.props.estado);
    }
    if (this.props.asignaciones.some((a) => a.camareroId === input.camareroId)) {
      throw new YaAsignadoError();
    }
    if (this.props.asignaciones.length >= this.props.cuposTotales) {
      throw new CupoLlenoError();
    }

    const asignacion: Asignacion = {
      id: input.asignacionId,
      camareroId: input.camareroId,
      aceptadaEn: input.ahora ?? new Date(),
    };
    this.props.asignaciones.push(asignacion);

    if (this.props.asignaciones.length === this.props.cuposTotales) {
      this.props.estado = "CUBIERTO";
    }

    return asignacion;
  }

  cancelar(): void {
    if (
      this.props.estado !== "PUBLICADO" &&
      this.props.estado !== "CUBIERTO"
    ) {
      throw new TransicionEstadoInvalidaError(this.props.estado, "CANCELADO");
    }
    this.props.estado = "CANCELADO";
  }

  haAceptado(camareroId: string): boolean {
    return this.props.asignaciones.some((a) => a.camareroId === camareroId);
  }

  get id(): string {
    return this.props.id;
  }
  get fechaInicio(): Date {
    return this.props.fechaInicio;
  }
  get duracionHoras(): number {
    return this.props.duracionHoras;
  }
  get lugar(): Lugar {
    return this.props.lugar;
  }
  get tipoEvento(): TipoEvento {
    return this.props.tipoEvento;
  }
  get cuposTotales(): number {
    return this.props.cuposTotales;
  }
  get cuposOcupados(): number {
    return this.props.asignaciones.length;
  }
  get uniforme(): string | null {
    return this.props.uniforme;
  }
  get notas(): string | null {
    return this.props.notas;
  }
  get estado(): EstadoServicio {
    return this.props.estado;
  }
  get version(): number {
    return this.props.version;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }
  get asignaciones(): ReadonlyArray<Asignacion> {
    return this.props.asignaciones;
  }
  get estaCompleto(): boolean {
    return this.props.asignaciones.length >= this.props.cuposTotales;
  }
}
