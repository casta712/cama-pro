import { DomainError } from "../../../../shared/errors/DomainError.js";
import type { EstadoServicio } from "../Servicio.js";

export class FechaInvalidaError extends DomainError {
  readonly code = "FECHA_INVALIDA";
  override readonly httpStatus = 400;
  constructor() {
    super("La fecha de inicio debe ser futura");
  }
}

export class ServicioMuyProximoError extends DomainError {
  readonly code = "SERVICIO_MUY_PROXIMO";
  override readonly httpStatus = 422;
  constructor(horasMinimas: number) {
    super(`El servicio debe publicarse con al menos ${horasMinimas} horas de antelacion`);
  }
}

export class ServicioYaEnCursoError extends DomainError {
  readonly code = "SERVICIO_YA_EN_CURSO";
  override readonly httpStatus = 409;
  constructor() {
    super("El servicio ya ha comenzado y no admite cambios");
  }
}

export class ServicioNoEditableError extends DomainError {
  readonly code = "SERVICIO_NO_EDITABLE";
  override readonly httpStatus = 409;
  constructor(estado: EstadoServicio) {
    super(`No se puede editar un servicio en estado ${estado}`);
  }
}

export class EdicionDuraConAsignacionesError extends DomainError {
  readonly code = "EDICION_DURA_CON_ASIGNACIONES";
  override readonly httpStatus = 409;
  constructor(campo: string) {
    super(
      `Hay camareros asignados: no se puede cambiar ${campo}. Cancela el servicio y vuelve a publicarlo si necesitas este cambio.`,
    );
  }
}

export class CuposPorDebajoDeAsignacionesError extends DomainError {
  readonly code = "CUPOS_POR_DEBAJO_DE_ASIGNACIONES";
  override readonly httpStatus = 409;
  constructor(cuposNuevos: number, asignados: number) {
    super(
      `No se pueden reducir los cupos a ${cuposNuevos}: ya hay ${asignados} camareros asignados`,
    );
  }
}

export class DuracionInvalidaError extends DomainError {
  readonly code = "DURACION_INVALIDA";
  override readonly httpStatus = 400;
  constructor() {
    super("La duracion debe estar entre 1 y 24 horas");
  }
}

export class CuposInvalidosError extends DomainError {
  readonly code = "CUPOS_INVALIDOS";
  override readonly httpStatus = 400;
  constructor() {
    super("Los cupos totales deben ser entre 1 y 200");
  }
}

export class CupoLlenoError extends DomainError {
  readonly code = "CUPO_LLENO";
  constructor() {
    super("Todos los cupos del servicio estan cubiertos");
  }
}

export class YaAsignadoError extends DomainError {
  readonly code = "YA_ASIGNADO";
  constructor() {
    super("Ya estas asignado a este servicio");
  }
}

export class ServicioNoDisponibleError extends DomainError {
  readonly code = "SERVICIO_NO_DISPONIBLE";
  constructor(estado: EstadoServicio) {
    super(`El servicio no esta disponible para aceptar (estado=${estado})`);
  }
}

export class TransicionEstadoInvalidaError extends DomainError {
  readonly code = "TRANSICION_ESTADO_INVALIDA";
  constructor(desde: EstadoServicio, hacia: EstadoServicio) {
    super(`No se puede pasar de ${desde} a ${hacia}`);
  }
}

export class CamareroNoActivoError extends DomainError {
  readonly code = "CAMARERO_NO_ACTIVO";
  override readonly httpStatus = 403;
  constructor() {
    super("Solo camareros activos pueden aceptar servicios");
  }
}

export class ServicioNoLiberableError extends DomainError {
  readonly code = "SERVICIO_NO_LIBERABLE";
  override readonly httpStatus = 409;
  constructor(estado: EstadoServicio) {
    super(`No se puede liberar la asignacion: el servicio esta en estado ${estado}`);
  }
}

export class LiberacionMuyTardiaError extends DomainError {
  readonly code = "LIBERACION_MUY_TARDIA";
  override readonly httpStatus = 422;
  constructor(horasMinimas: number) {
    super(
      `Para liberar una asignacion hay que avisar con al menos ${horasMinimas} horas de antelacion`,
    );
  }
}

export class CamareroSinAsignacionError extends DomainError {
  readonly code = "CAMARERO_SIN_ASIGNACION";
  override readonly httpStatus = 404;
  constructor() {
    super("No tienes asignacion en este servicio");
  }
}

export class CamareroConServicioSolapadoError extends DomainError {
  readonly code = "CAMARERO_CON_SERVICIO_SOLAPADO";
  override readonly httpStatus = 409;
  constructor(
    readonly servicioExistente: {
      id: string;
      fechaInicio: Date;
      duracionHoras: number;
      lugar: string;
    },
  ) {
    super(
      `Ya tienes aceptado un servicio en ${servicioExistente.lugar} que se solapa con este horario.`,
    );
  }
}
