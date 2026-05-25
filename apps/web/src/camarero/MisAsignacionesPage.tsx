import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { listarMisAsignaciones } from "./api.js";

export function MisAsignacionesPage(): JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["camarero", "mis-asignaciones"],
    queryFn: listarMisAsignaciones,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Tu agenda"
        titulo="Mis asignaciones."
        subtitulo="Servicios que has aceptado, ordenados por fecha."
      />

      {isLoading && <p className="text-ash text-sm">Cargando agenda...</p>}
      {isError && (
        <p className="text-wine text-sm">
          No se pudo cargar la lista: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          titulo="Tu agenda esta vacia."
          descripcion="Cuando aceptes un servicio aparecera aqui con todos sus detalles."
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <ServicioCard
              key={s.id}
              servicio={s}
              verDetallePath={`/servicios/${s.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
