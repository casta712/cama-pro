import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { cancelarServicio, listarServiciosGestor } from "./api.js";

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
            <ServicioCard
              key={s.id}
              servicio={s}
              accion={
                s.estado === "PUBLICADO" || s.estado === "CUBIERTO" ? (
                  <Button
                    variante="ghost"
                    tamano="sm"
                    onClick={() => onCancelar(s)}
                    disabled={cancelar.isPending}
                  >
                    Cancelar servicio
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
