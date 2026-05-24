import { useState, type FormEvent } from "react";
import type { CrearServicioInput, TipoEvento } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { Input } from "../shared/ui/Input.js";
import { Select } from "../shared/ui/Select.js";
import { Textarea } from "../shared/ui/Textarea.js";

const TIPOS: ReadonlyArray<{ value: TipoEvento; label: string }> = [
  { value: "BODA", label: "Boda" },
  { value: "CORPORATIVO", label: "Corporativo" },
  { value: "CENA_PRIVADA", label: "Cena privada" },
  { value: "COCTEL", label: "Coctel" },
  { value: "BANQUETE", label: "Banquete" },
  { value: "OTRO", label: "Otro" },
];

export const ANTELACION_MINIMA_HORAS = 3;
const HORA_MS = 60 * 60 * 1000;

function minimoFechaHoraLocal(): { fecha: string; hora: string } {
  const minimo = new Date(Date.now() + ANTELACION_MINIMA_HORAS * HORA_MS);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return {
    fecha: `${minimo.getFullYear()}-${pad(minimo.getMonth() + 1)}-${pad(minimo.getDate())}`,
    hora: `${pad(minimo.getHours())}:${pad(minimo.getMinutes())}`,
  };
}

/**
 * Descompone un ISO datetime a fecha (YYYY-MM-DD) y hora (HH:MM) en zona
 * local, para llenar los inputs date/time del form.
 */
export function isoAFechaHoraLocal(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export interface ServicioFormularioValores {
  fecha: string;
  hora: string;
  duracionHoras: string;
  lugarNombre: string;
  lugarDireccion: string;
  tipoEvento: TipoEvento | "";
  cuposTotales: string;
  uniforme: string;
  notas: string;
}

export const VALORES_INICIALES: ServicioFormularioValores = {
  fecha: "",
  hora: "",
  duracionHoras: "6",
  lugarNombre: "",
  lugarDireccion: "",
  tipoEvento: "",
  cuposTotales: "4",
  uniforme: "",
  notas: "",
};

interface Props {
  valoresIniciales?: ServicioFormularioValores;
  modo: "crear" | "editar";
  bloquearCamposDuros?: boolean;
  mensajeBloqueo?: string;
  enviando: boolean;
  errorGlobal?: string;
  errores?: Record<string, string>;
  onSubmit: (valores: ServicioFormularioValores) => void;
  onCancelar: () => void;
}

export function ServicioFormulario({
  valoresIniciales = VALORES_INICIALES,
  modo,
  bloquearCamposDuros,
  mensajeBloqueo,
  enviando,
  errorGlobal,
  errores = {},
  onSubmit,
  onCancelar,
}: Props): JSX.Element {
  const [valores, setValores] = useState<ServicioFormularioValores>(valoresIniciales);
  const [minimo] = useState(minimoFechaHoraLocal);

  const set = <K extends keyof ServicioFormularioValores>(campo: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    setValores((v) => ({ ...v, [campo]: e.target.value as ServicioFormularioValores[K] }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit(valores);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 animate-fadeIn">
      {bloquearCamposDuros && mensajeBloqueo && (
        <div className="border border-terra/40 bg-terra/5 text-terra-deep text-sm px-4 py-3 rounded-card">
          {mensajeBloqueo}
        </div>
      )}

      <Seccion titulo="Cuando">
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Fecha"
            type="date"
            min={modo === "crear" ? minimo.fecha : undefined}
            value={valores.fecha}
            onChange={set("fecha")}
            error={errores.fecha}
            hint={
              bloquearCamposDuros
                ? undefined
                : `Minimo ${ANTELACION_MINIMA_HORAS}h de antelacion`
            }
            disabled={bloquearCamposDuros}
            required
          />
          <Input
            label="Hora"
            type="time"
            min={
              modo === "crear" && valores.fecha === minimo.fecha ? minimo.hora : undefined
            }
            value={valores.hora}
            onChange={set("hora")}
            disabled={bloquearCamposDuros}
            required
          />
          <Input
            label="Duracion (horas)"
            type="number"
            min={1}
            max={24}
            value={valores.duracionHoras}
            onChange={set("duracionHoras")}
            error={errores.duracionHoras}
            disabled={bloquearCamposDuros}
            required
          />
        </div>
      </Seccion>

      <Seccion titulo="Donde">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Nombre del lugar"
            placeholder="Castillo de Vendrell"
            value={valores.lugarNombre}
            onChange={set("lugarNombre")}
            error={errores["lugar.nombre"]}
            disabled={bloquearCamposDuros}
            required
          />
          <Input
            label="Direccion"
            placeholder="Calle Mayor 12, Vendrell"
            value={valores.lugarDireccion}
            onChange={set("lugarDireccion")}
            error={errores["lugar.direccion"]}
            disabled={bloquearCamposDuros}
            required
          />
        </div>
      </Seccion>

      <Seccion titulo="Que servicio">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de evento"
            value={valores.tipoEvento}
            onChange={set("tipoEvento")}
            placeholder="Selecciona uno"
            opciones={TIPOS}
            error={errores.tipoEvento}
            required
          />
          <Input
            label="Cupos totales"
            type="number"
            min={1}
            max={200}
            value={valores.cuposTotales}
            onChange={set("cuposTotales")}
            error={errores.cuposTotales}
            disabled={bloquearCamposDuros}
            required
          />
        </div>
      </Seccion>

      <Seccion titulo="Detalle (opcional)">
        <div className="space-y-4">
          <Input
            label="Uniforme"
            placeholder="Camisa blanca, pantalon negro, zapato cerrado"
            value={valores.uniforme}
            onChange={set("uniforme")}
          />
          <Textarea
            label="Notas"
            placeholder="Acceso por la entrada de servicio, briefing 30 min antes..."
            rows={3}
            value={valores.notas}
            onChange={set("notas")}
          />
        </div>
      </Seccion>

      {errorGlobal && (
        <div role="alert" className="border border-wine/40 bg-wine/5 text-wine text-sm px-3 py-2 rounded-card">
          {errorGlobal}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        <Button type="button" variante="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" loading={enviando}>
          {modo === "crear" ? "Publicar servicio" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="border-t border-line pt-6">
      <p className="eyebrow mb-4">{titulo}</p>
      {children}
    </section>
  );
}

/**
 * Convierte los valores del formulario al input que espera la API de
 * crear. Lanza si falta algun campo requerido o falla la validacion local
 * (fecha+hora obligatorias, tipo obligatorio).
 */
export function valoresACrearInput(v: ServicioFormularioValores): CrearServicioInput | { error: Record<string, string> } {
  const errs: Record<string, string> = {};
  if (!v.fecha || !v.hora) errs.fecha = "Fecha y hora requeridas";
  if (!v.tipoEvento) errs.tipoEvento = "Selecciona un tipo";
  if (Object.keys(errs).length > 0) return { error: errs };

  const fechaInicio = new Date(`${v.fecha}T${v.hora}:00`);
  const minimoMs = Date.now() + ANTELACION_MINIMA_HORAS * HORA_MS;
  if (fechaInicio.getTime() < minimoMs) {
    return { error: { fecha: `Minimo ${ANTELACION_MINIMA_HORAS}h de antelacion para publicar` } };
  }

  return {
    fechaInicio: fechaInicio.toISOString(),
    duracionHoras: Number(v.duracionHoras),
    lugar: { nombre: v.lugarNombre, direccion: v.lugarDireccion },
    tipoEvento: v.tipoEvento as TipoEvento,
    cuposTotales: Number(v.cuposTotales),
    uniforme: v.uniforme || undefined,
    notas: v.notas || undefined,
  };
}
