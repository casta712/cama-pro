import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CrearServicioInput, type TipoEvento } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { Input } from "../shared/ui/Input.js";
import { Select } from "../shared/ui/Select.js";
import { Textarea } from "../shared/ui/Textarea.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ApiError } from "../shared/fetchClient.js";
import { crearServicio } from "./api.js";

interface Formulario {
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

const INICIAL: Formulario = {
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

const TIPOS: ReadonlyArray<{ value: TipoEvento; label: string }> = [
  { value: "BODA", label: "Boda" },
  { value: "CORPORATIVO", label: "Corporativo" },
  { value: "CENA_PRIVADA", label: "Cena privada" },
  { value: "COCTEL", label: "Coctel" },
  { value: "BANQUETE", label: "Banquete" },
  { value: "OTRO", label: "Otro" },
];

const ANTELACION_MINIMA_HORAS = 3;
const HORA_MS = 60 * 60 * 1000;

/**
 * Devuelve "YYYY-MM-DD" y "HH:MM" en zona horaria local para usar como `min`
 * en inputs date/time. El backend exige minimo {ANTELACION_MINIMA_HORAS}h.
 */
function minimoFechaHoraLocal(): { fecha: string; hora: string; iso: string } {
  const minimo = new Date(Date.now() + ANTELACION_MINIMA_HORAS * HORA_MS);
  const yyyy = minimo.getFullYear();
  const mm = String(minimo.getMonth() + 1).padStart(2, "0");
  const dd = String(minimo.getDate()).padStart(2, "0");
  const hh = String(minimo.getHours()).padStart(2, "0");
  const mi = String(minimo.getMinutes()).padStart(2, "0");
  return {
    fecha: `${yyyy}-${mm}-${dd}`,
    hora: `${hh}:${mi}`,
    iso: minimo.toISOString(),
  };
}

export function CrearServicioPage(): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [valores, setValores] = useState<Formulario>(INICIAL);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [minimo] = useState(minimoFechaHoraLocal);

  const crear = useMutation({
    mutationFn: crearServicio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor", "servicios"] });
      navigate("/gestor/servicios");
    },
    onError: (err: unknown) => {
      const mensaje =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo crear el servicio";
      setErrores({ global: mensaje });
    },
  });

  const set = <K extends keyof Formulario>(campo: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    setValores((v) => ({ ...v, [campo]: e.target.value as Formulario[K] }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setErrores({});

    if (!valores.fecha || !valores.hora) {
      setErrores({ fecha: "Fecha y hora requeridas" });
      return;
    }
    if (!valores.tipoEvento) {
      setErrores({ tipoEvento: "Selecciona un tipo" });
      return;
    }

    const fechaInicio = new Date(`${valores.fecha}T${valores.hora}:00`);
    const minimoMs = Date.now() + ANTELACION_MINIMA_HORAS * HORA_MS;
    if (fechaInicio.getTime() < minimoMs) {
      setErrores({
        fecha: `Minimo ${ANTELACION_MINIMA_HORAS}h de antelacion para publicar`,
      });
      return;
    }
    const candidato = {
      fechaInicio: fechaInicio.toISOString(),
      duracionHoras: Number(valores.duracionHoras),
      lugar: {
        nombre: valores.lugarNombre,
        direccion: valores.lugarDireccion,
      },
      tipoEvento: valores.tipoEvento,
      cuposTotales: Number(valores.cuposTotales),
      uniforme: valores.uniforme || undefined,
      notas: valores.notas || undefined,
    };

    const parsed = CrearServicioInput.safeParse(candidato);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const ruta = issue.path.join(".");
        errs[ruta] = issue.message;
      }
      setErrores(errs);
      return;
    }

    crear.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Nuevo servicio"
        titulo="Publicar."
        subtitulo="Define la fecha, el lugar y cuantos camareros necesitas. Cuando publiques, el equipo lo vera al instante."
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6 animate-fadeIn">
        <Seccion titulo="Cuando">
          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Fecha"
              type="date"
              min={minimo.fecha}
              value={valores.fecha}
              onChange={set("fecha")}
              error={errores.fecha}
              hint={`Minimo ${ANTELACION_MINIMA_HORAS}h de antelacion`}
              required
            />
            <Input
              label="Hora"
              type="time"
              min={valores.fecha === minimo.fecha ? minimo.hora : undefined}
              value={valores.hora}
              onChange={set("hora")}
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
              required
            />
            <Input
              label="Direccion"
              placeholder="Calle Mayor 12, Vendrell"
              value={valores.lugarDireccion}
              onChange={set("lugarDireccion")}
              error={errores["lugar.direccion"]}
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

        {errores.global && (
          <div role="alert" className="border border-wine/40 bg-wine/5 text-wine text-sm px-3 py-2 rounded-card">
            {errores.global}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <Button type="button" variante="ghost" onClick={() => navigate("/gestor/servicios")}>
            Cancelar
          </Button>
          <Button type="submit" loading={crear.isPending}>
            Publicar servicio
          </Button>
        </div>
      </form>
    </div>
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
