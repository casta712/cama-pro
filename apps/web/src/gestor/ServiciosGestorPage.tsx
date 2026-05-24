import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { formatearFecha, formatearHora } from "../shared/format.js";
import {
  cancelarServicio,
  listarAsignacionesServicio,
  listarServiciosGestor,
} from "./api.js";

interface FiltroOpcion {
  value: "" | EstadoServicio;
  label: string;
}

const FILTROS: ReadonlyArray<FiltroOpcion> = [
  { value: "", label: "Todos" },
  { value: "PUBLICADO", label: "Publicados" },
  { value: "CUBIERTO", label: "Cubiertos" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "FINALIZADO", label: "Finalizados" },
  { value: "CANCELADO", label: "Cancelados" },
];

export function ServiciosGestorPage(): JSX.Element {
  const [filtro, setFiltro] = useState<"" | EstadoServicio>("");
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gestor", "servicios", filtro],
    queryFn: () => listarServiciosGestor(filtro || undefined),
  });

  const cancelar = useMutation({
    mutationFn: cancelarServicio,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gestor", "servicios"] }),
  });

  const onCancelar = (s: ServicioDTO): void => {
    if (!window.confirm(`Cancelar el servicio del ${new Date(s.fechaInicio).toLocaleDateString("es-ES")}?`)) return;
    cancelar.mutate(s.id);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Panel del gestor"
        titulo="Servicios."
        subtitulo="Publica un nuevo servicio o revisa el estado de los que tienes en marcha."
        accion={
          <Link to="/gestor/servicios/nuevo">
            <Button>Nuevo servicio</Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={[
              "px-3 py-1.5 text-xs font-mono uppercase tracking-wider2 rounded-card border transition-colors",
              filtro === f.value
                ? "bg-ink text-bone border-ink"
                : "bg-transparent text-ash border-line hover:border-ink hover:text-ink",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="sm:hidden mb-4">
        <Link to="/gestor/servicios/nuevo" className="block">
          <Button className="w-full">Nuevo servicio</Button>
        </Link>
      </div>

      {isLoading && <p className="text-ash text-sm">Cargando servicios...</p>}
      {isError && (
        <p className="text-wine text-sm">
          No se pudo cargar la lista: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          titulo="Sin servicios todavia."
          descripcion="Cuando publiques un servicio aparecera aqui con su estado y cupos en tiempo real."
          accion={
            <Link to="/gestor/servicios/nuevo">
              <Button>Publicar el primero</Button>
            </Link>
          }
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <ServicioGestorCard
              key={s.id}
              servicio={s}
              onCancelar={onCancelar}
              cancelando={cancelar.isPending && cancelar.variables === s.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  servicio: ServicioDTO;
  onCancelar: (s: ServicioDTO) => void;
  cancelando: boolean;
}

function ServicioGestorCard({ servicio, onCancelar, cancelando }: CardProps): JSX.Element {
  const [verAsignaciones, setVerAsignaciones] = useState(false);
  const puedeCancelar = servicio.estado === "PUBLICADO" || servicio.estado === "CUBIERTO";
  const tieneAsignaciones = servicio.cuposOcupados > 0;

  const acciones = (
    <div className="flex flex-wrap gap-2 justify-end">
      {tieneAsignaciones && (
        <Button
          variante="ghost"
          tamano="sm"
          onClick={() => setVerAsignaciones((v) => !v)}
        >
          {verAsignaciones ? "Ocultar equipo" : `Ver equipo (${servicio.cuposOcupados})`}
        </Button>
      )}
      {puedeCancelar && (
        <Button
          variante="ghost"
          tamano="sm"
          onClick={() => onCancelar(servicio)}
          disabled={cancelando}
        >
          Cancelar servicio
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      <ServicioCard servicio={servicio} accion={acciones} />
      {verAsignaciones && tieneAsignaciones && (
        <AsignacionesPanel servicioId={servicio.id} />
      )}
    </div>
  );
}

function AsignacionesPanel({ servicioId }: { servicioId: string }): JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gestor", "asignaciones", servicioId],
    queryFn: () => listarAsignacionesServicio(servicioId),
  });

  return (
    <div className="border border-line border-t-0 rounded-card rounded-t-none bg-cream/40 p-4 sm:p-5 animate-fadeIn">
      <p className="eyebrow mb-3">Equipo asignado</p>

      {isLoading && <p className="text-sm text-ash">Cargando equipo...</p>}
      {isError && (
        <p className="text-sm text-wine">
          No se pudo cargar: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-ash italic">Sin asignaciones aun.</p>
      )}

      {data && data.length > 0 && (
        <ul className="divide-y divide-line">
          {data.map((a) => (
            <li key={a.id} className="py-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{a.nombre}</p>
                <p className="text-xs text-ash">
                  <a href={`mailto:${a.email}`} className="hover:text-terra underline-offset-2 hover:underline">
                    {a.email}
                  </a>
                  {" · "}
                  <a href={`tel:${a.telefono}`} className="font-mono hover:text-terra underline-offset-2 hover:underline">
                    {a.telefono}
                  </a>
                </p>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider2 text-ash whitespace-nowrap">
                acepto {formatearFecha(a.aceptadaEn)} {formatearHora(a.aceptadaEn)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
