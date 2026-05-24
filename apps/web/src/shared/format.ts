import type { TipoEvento } from "@cama-pro/shared-types";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const FORMATO_HORA = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatearFecha(iso: string): string {
  return FORMATO_FECHA.format(new Date(iso)).replace(".", "");
}

export function formatearFechaLarga(iso: string): string {
  return FORMATO_FECHA_LARGA.format(new Date(iso));
}

export function formatearHora(iso: string): string {
  return FORMATO_HORA.format(new Date(iso));
}

const ETIQUETAS_EVENTO: Record<TipoEvento, string> = {
  BODA: "Boda",
  CORPORATIVO: "Corporativo",
  CENA_PRIVADA: "Cena privada",
  COCTEL: "Coctel",
  BANQUETE: "Banquete",
  OTRO: "Otro",
};

export function etiquetaEvento(t: TipoEvento): string {
  return ETIQUETAS_EVENTO[t];
}
