import { useQuery } from "@tanstack/react-query";
import { formatearFecha, formatearHora } from "../shared/format.js";
import { listarAsignacionesServicio } from "./api.js";

export function AsignacionesPanel({ servicioId }: { servicioId: string }): JSX.Element {
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
