import {
  BioInvalidaError,
  NombreInvalidoError,
  TelefonoInvalidoError,
} from "./errors/StaffErrors.js";

export type EstadoCuentaCamarero =
  | "PENDIENTE_APROBACION"
  | "ACTIVO"
  | "SUSPENDIDO";

export const BIO_MIN_LONGITUD = 30;
export const BIO_MAX_LONGITUD = 1000;

interface CamareroProps {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  bio: string;
  estadoCuenta: EstadoCuentaCamarero;
  creadoEn: Date;
}

/**
 * Agregado Camarero (contexto staff).
 *
 * Reglas:
 *  - Al crear: nombre 2..80 chars, telefono 6..20 chars, email validado en el borde HTTP.
 *  - estadoCuenta inicial = PENDIENTE_APROBACION.
 *  - aprobar(): cualquier estado -> ACTIVO (idempotente desde ACTIVO).
 *  - suspender(): cualquier estado -> SUSPENDIDO (idempotente desde SUSPENDIDO).
 *  - Solo un Camarero en estado ACTIVO puede aceptar Servicios
 *    (lo aplica el modulo bookings al consultar puedeAceptarServicios).
 */
export class Camarero {
  private constructor(private readonly props: CamareroProps) {}

  static crear(input: {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    bio: string;
  }): Camarero {
    const nombre = input.nombre.trim();
    if (nombre.length < 2 || nombre.length > 80) {
      throw new NombreInvalidoError();
    }
    const telefono = input.telefono.trim();
    if (telefono.length < 6 || telefono.length > 20) {
      throw new TelefonoInvalidoError();
    }
    const bio = input.bio.trim();
    if (bio.length < BIO_MIN_LONGITUD || bio.length > BIO_MAX_LONGITUD) {
      throw new BioInvalidaError();
    }

    return new Camarero({
      id: input.id,
      nombre,
      email: input.email.trim().toLowerCase(),
      telefono,
      bio,
      estadoCuenta: "PENDIENTE_APROBACION",
      creadoEn: new Date(),
    });
  }

  static reconstituir(props: CamareroProps): Camarero {
    return new Camarero(props);
  }

  aprobar(): void {
    (this.props as { estadoCuenta: EstadoCuentaCamarero }).estadoCuenta = "ACTIVO";
  }

  suspender(): void {
    (this.props as { estadoCuenta: EstadoCuentaCamarero }).estadoCuenta = "SUSPENDIDO";
  }

  get puedeAceptarServicios(): boolean {
    return this.props.estadoCuenta === "ACTIVO";
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get email(): string {
    return this.props.email;
  }
  get telefono(): string {
    return this.props.telefono;
  }
  get bio(): string {
    return this.props.bio;
  }
  get estadoCuenta(): EstadoCuentaCamarero {
    return this.props.estadoCuenta;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }
}
