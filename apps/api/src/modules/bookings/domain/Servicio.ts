import {
  CamareroSinAsignacionError,
  CupoLlenoError,
  CuposInvalidosError,
  CuposPorDebajoDeAsignacionesError,
  DuracionInvalidaError,
  EdicionDuraConAsignacionesError,
  FechaInvalidaError,
  LiberacionMuyTardiaError,
  ServicioMuyProximoError,
  ServicioNoDisponibleError,
  ServicioNoEditableError,
  ServicioNoLiberableError,
  ServicioYaEnCursoError,
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
export const ANTELACION_MINIMA_HORAS = 3;
const ANTELACION_MINIMA_MS = ANTELACION_MINIMA_HORAS * 60 * 60 * 1000;

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
    if (input.fechaInicio.getTime() < ahora.getTime() + ANTELACION_MINIMA_MS) {
      throw new ServicioMuyProximoError(ANTELACION_MINIMA_HORAS);
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
    const ahora = input.ahora ?? new Date();
    if (this.props.estado !== "PUBLICADO") {
      throw new ServicioNoDisponibleError(this.props.estado);
    }
    if (ahora.getTime() >= this.props.fechaInicio.getTime()) {
      throw new ServicioYaEnCursoError();
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
      aceptadaEn: ahora,
    };
    this.props.asignaciones.push(asignacion);

    if (this.props.asignaciones.length === this.props.cuposTotales) {
      this.props.estado = "CUBIERTO";
    }

    return asignacion;
  }

  /**
   * Edita los campos mutables del servicio.
   *
   * Reglas:
   *  - Solo se puede editar si `estadoActual === "PUBLICADO"` (no CUBIERTO,
   *    EN_CURSO, FINALIZADO ni CANCELADO).
   *  - Campos blandos (tipoEvento, uniforme, notas): siempre editables.
   *  - Campos duros (fechaInicio, duracionHoras, lugar, cuposTotales): solo
   *    editables si NO hay asignaciones aceptadas, para no romper el
   *    contrato implicito con los camareros que ya aceptaron.
   *  - Cualquier nueva fechaInicio se valida contra la antelacion minima.
   *
   * Si necesitas cambiar algo duro con asignaciones, cancela el servicio
   * y publica uno nuevo. La compensacion la decide el operador, no el agregado.
   */
  editar(
    cambios: {
      fechaInicio?: Date;
      duracionHoras?: number;
      lugar?: Lugar;
      tipoEvento?: TipoEvento;
      cuposTotales?: number;
      uniforme?: string | null;
      notas?: string | null;
    },
    ahora: Date = new Date(),
  ): void {
    const efectivo = this.estadoActual(ahora);
    if (efectivo !== "PUBLICADO") {
      throw new ServicioNoEditableError(efectivo);
    }

    const hayAsignaciones = this.props.asignaciones.length > 0;
    const tieneCambioDuro =
      cambios.fechaInicio !== undefined ||
      cambios.duracionHoras !== undefined ||
      cambios.lugar !== undefined ||
      cambios.cuposTotales !== undefined;

    if (hayAsignaciones && tieneCambioDuro) {
      const campo =
        cambios.fechaInicio !== undefined
          ? "la fecha"
          : cambios.duracionHoras !== undefined
            ? "la duracion"
            : cambios.lugar !== undefined
              ? "el lugar"
              : "los cupos";
      throw new EdicionDuraConAsignacionesError(campo);
    }

    if (cambios.fechaInicio !== undefined) {
      if (cambios.fechaInicio.getTime() <= ahora.getTime()) {
        throw new FechaInvalidaError();
      }
      if (cambios.fechaInicio.getTime() < ahora.getTime() + ANTELACION_MINIMA_MS) {
        throw new ServicioMuyProximoError(ANTELACION_MINIMA_HORAS);
      }
      this.props.fechaInicio = cambios.fechaInicio;
    }

    if (cambios.duracionHoras !== undefined) {
      if (
        !Number.isInteger(cambios.duracionHoras) ||
        cambios.duracionHoras < 1 ||
        cambios.duracionHoras > MAX_HORAS
      ) {
        throw new DuracionInvalidaError();
      }
      this.props.duracionHoras = cambios.duracionHoras;
    }

    if (cambios.lugar !== undefined) {
      this.props.lugar = cambios.lugar;
    }

    if (cambios.cuposTotales !== undefined) {
      if (
        !Number.isInteger(cambios.cuposTotales) ||
        cambios.cuposTotales < 1 ||
        cambios.cuposTotales > MAX_CUPOS
      ) {
        throw new CuposInvalidosError();
      }
      if (cambios.cuposTotales < this.props.asignaciones.length) {
        throw new CuposPorDebajoDeAsignacionesError(
          cambios.cuposTotales,
          this.props.asignaciones.length,
        );
      }
      this.props.cuposTotales = cambios.cuposTotales;
    }

    if (cambios.tipoEvento !== undefined) {
      this.props.tipoEvento = cambios.tipoEvento;
    }

    if (cambios.uniforme !== undefined) {
      this.props.uniforme = cambios.uniforme?.trim() || null;
    }

    if (cambios.notas !== undefined) {
      this.props.notas = cambios.notas?.trim() || null;
    }
  }

  /**
   * El camarero libera su asignacion previamente aceptada.
   *
   * Reglas:
   *  - Solo permitido si `estadoActual ∈ {PUBLICADO, CUBIERTO}`. Si el
   *    servicio esta EN_CURSO, FINALIZADO o CANCELADO no tiene sentido.
   *  - Misma antelacion minima que `crear` (3h): liberar al limite no le da
   *    margen al gestor para buscar reemplazo.
   *  - El camarero debe tener efectivamente una asignacion en este servicio.
   *  - Si el servicio estaba CUBIERTO, vuelve a PUBLICADO al liberar.
   *
   * Devuelve el id de la asignacion borrada (necesario para que el repo
   * lo elimine fisicamente) y si el servicio reverto a PUBLICADO (util
   * para metricas / logs cross-context).
   */
  liberarPorCamarero(
    camareroId: string,
    ahora: Date = new Date(),
  ): { asignacionId: string; volvioAPublicado: boolean } {
    const efectivo = this.estadoActual(ahora);
    if (efectivo !== "PUBLICADO" && efectivo !== "CUBIERTO") {
      throw new ServicioNoLiberableError(efectivo);
    }
    if (ahora.getTime() + ANTELACION_MINIMA_MS > this.props.fechaInicio.getTime()) {
      throw new LiberacionMuyTardiaError(ANTELACION_MINIMA_HORAS);
    }

    const idx = this.props.asignaciones.findIndex(
      (a) => a.camareroId === camareroId,
    );
    if (idx === -1) {
      throw new CamareroSinAsignacionError();
    }
    const removed = this.props.asignaciones[idx]!;
    this.props.asignaciones.splice(idx, 1);

    let volvioAPublicado = false;
    if (this.props.estado === "CUBIERTO") {
      this.props.estado = "PUBLICADO";
      volvioAPublicado = true;
    }

    return { asignacionId: removed.id, volvioAPublicado };
  }

  cancelar(ahora: Date = new Date()): void {
    const efectivo = this.estadoActual(ahora);
    if (efectivo !== "PUBLICADO" && efectivo !== "CUBIERTO") {
      throw new TransicionEstadoInvalidaError(efectivo, "CANCELADO");
    }
    this.props.estado = "CANCELADO";
  }

  /**
   * Estado efectivo del servicio en un instante dado.
   *
   * CANCELADO y FINALIZADO persistidos siempre ganan. Para los demas, el
   * tiempo decide: si ya termino -> FINALIZADO, si ya empezo -> EN_CURSO,
   * si no -> el estado persistido (PUBLICADO o CUBIERTO).
   *
   * Se computa al vuelo para evitar acoplar la coherencia del agregado a
   * un cron. La persistencia solo refleja decisiones humanas (publicar,
   * aceptar, cancelar). Ver docs/dominio.md.
   */
  estadoActual(ahora: Date = new Date()): EstadoServicio {
    if (this.props.estado === "CANCELADO") return "CANCELADO";
    if (this.props.estado === "FINALIZADO") return "FINALIZADO";
    const inicio = this.props.fechaInicio.getTime();
    const fin = inicio + this.props.duracionHoras * 60 * 60 * 1000;
    const t = ahora.getTime();
    if (t >= fin) return "FINALIZADO";
    if (t >= inicio) return "EN_CURSO";
    return this.props.estado;
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
