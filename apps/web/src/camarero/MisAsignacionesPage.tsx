import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServicioDTO } from "@cama-pro/shared-types";
import { ApiError } from "../shared/fetchClient.js";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { liberarMiAsignacion, listarMisAsignaciones } from "./api.js";

const ANTELACION_MIN_MS = 3 * 60 * 60 * 1000;

interface LiberableInfo {
  puede: boolean;
  motivo?: string;
}

/**
 * Replica las reglas del backend en local solo para UX (habilitar/desabilitar
 * boton). El backend sigue siendo la autoridad: si cambia algo entre el
 * render y el click, recibira el error y se mostrara al usuario.
 */
function puedeLiberar(s: ServicioDTO, ahora = Date.now()): LiberableInfo {
  if (s.estado !== "PUBLICADO" && s.estado !== "CUBIERTO") {
    return {
      puede: false,
      motivo: `No se puede liberar un servicio en estado ${s.estado.toLowerCase()}`,
    };
  }
  const ms = new Date(s.fechaInicio).getTime() - ahora;
  if (ms <= 0) {
    return { puede: false, motivo: "El servicio ya ha comenzado" };
  }
  if (ms < ANTELACION_MIN_MS) {
    return {
      puede: false,
      motivo: "Hay que avisar con al menos 3 horas de antelacion",
    };
  }
  return { puede: true };
}

export function MisAsignacionesPage(): JSX.Element {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["camarero", "mis-asignaciones"],
    queryFn: listarMisAsignaciones,
  });

  const liberar = useMutation({
    mutationFn: liberarMiAsignacion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camarero", "mis-asignaciones"] });
      qc.invalidateQueries({ queryKey: ["camarero", "disponibles"] });
      // Si tras liberar aparece un nuevo aviso para el gestor, no es para
      // este camarero — pero invalidamos por si acaso.
      qc.invalidateQueries({ queryKey: ["avisos"] });
      qc.invalidateQueries({ queryKey: ["avisos", "count"] });
    },
  });

  const onLiberar = (s: ServicioDTO): void => {
    const ok = window.confirm(
      `¿Seguro que quieres abandonar el servicio en ${s.lugar.nombre}? El gestor recibira un aviso.`,
    );
    if (!ok) return;
    liberar.mutate(s.id);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Tu agenda"
        titulo="Mis asignaciones."
        subtitulo="Servicios que has aceptado, ordenados por fecha."
      />

      {liberar.isError && (
        <p className="text-wine text-sm mb-4">
          No se pudo liberar:{" "}
          {liberar.error instanceof ApiError
            ? liberar.error.message
            : (liberar.error as Error).message}
        </p>
      )}

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
          {data.map((s) => {
            const info = puedeLiberar(s);
            const enCurso = liberar.isPending && liberar.variables === s.id;
            return (
              <ServicioCard
                key={s.id}
                servicio={s}
                verDetallePath={`/servicios/${s.id}`}
                accion={
                  <Button
                    variante="ghost"
                    tamano="sm"
                    onClick={() => onLiberar(s)}
                    disabled={!info.puede || enCurso}
                    title={info.motivo}
                  >
                    {enCurso ? "Liberando..." : "Liberar asignacion"}
                  </Button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
