import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { AsignacionesPanel } from "./AsignacionesPanel.js";
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
  const navigate = useNavigate();
  const puedeCancelar = servicio.estado === "PUBLICADO" || servicio.estado === "CUBIERTO";
  const puedeEditar = servicio.estado === "PUBLICADO";
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
      {puedeEditar && (
        <Button
          variante="ghost"
          tamano="sm"
          onClick={() => navigate(`/gestor/servicios/${servicio.id}/editar`)}
        >
          Editar
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
      <ServicioCard
        servicio={servicio}
        accion={acciones}
        verDetallePath={`/servicios/${servicio.id}`}
      />
      {verAsignaciones && tieneAsignaciones && (
        <AsignacionesPanel servicioId={servicio.id} />
      )}
    </div>
  );
}
