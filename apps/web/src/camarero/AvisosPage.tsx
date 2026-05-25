import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { NotificacionDTO } from "@cama-pro/shared-types";
import { Badge } from "../shared/ui/Badge.js";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import {
  etiquetaEvento,
  formatearFecha,
  formatearHora,
} from "../shared/format.js";
import {
  listarMisAvisos,
  marcarAvisoLeido,
  marcarTodosAvisosLeidos,
} from "./avisosApi.js";

export function AvisosPage(): JSX.Element {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["camarero", "avisos"],
    queryFn: listarMisAvisos,
  });

  const invalidar = (): void => {
    qc.invalidateQueries({ queryKey: ["camarero", "avisos"] });
    qc.invalidateQueries({ queryKey: ["camarero", "avisos", "count"] });
  };

  const marcarUno = useMutation({
    mutationFn: marcarAvisoLeido,
    onSuccess: invalidar,
  });

  const marcarTodos = useMutation({
    mutationFn: marcarTodosAvisosLeidos,
    onSuccess: invalidar,
  });

  const abrirAviso = (aviso: NotificacionDTO): void => {
    if (!aviso.leidaEn) {
      marcarUno.mutate(aviso.id);
    }
    navigate(`/servicios/${aviso.servicioId}`);
  };

  const hayNoLeidos = (data ?? []).some((a) => a.leidaEn === null);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Tu actividad"
        titulo="Avisos."
        subtitulo="Cambios en los servicios que has aceptado."
        accion={
          hayNoLeidos ? (
            <Button
              variante="ghost"
              tamano="sm"
              onClick={() => marcarTodos.mutate()}
              disabled={marcarTodos.isPending}
            >
              Marcar todos leidos
            </Button>
          ) : undefined
        }
      />

      {isLoading && <p className="text-ash text-sm">Cargando avisos...</p>}
      {isError && (
        <p className="text-wine text-sm">
          No se pudieron cargar los avisos: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          titulo="Sin avisos."
          descripcion="Aqui apareceran los cambios y cancelaciones en los servicios que has aceptado."
        />
      )}

      {data && data.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {data.map((a) => (
            <AvisoFila
              key={a.id}
              aviso={a}
              onAbrir={() => abrirAviso(a)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilaProps {
  aviso: NotificacionDTO;
  onAbrir: () => void;
}

function AvisoFila({ aviso, onAbrir }: FilaProps): JSX.Element {
  const noLeido = aviso.leidaEn === null;
  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        className={[
          "w-full text-left p-4 rounded-card border transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra",
          noLeido
            ? "bg-bone border-ink/20 hover:border-ink/40"
            : "bg-cream/60 border-line hover:border-ink/30",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tono={aviso.tipo === "SERVICIO_CANCELADO" ? "wine" : "ambar"}>
              {aviso.tipo === "SERVICIO_CANCELADO" ? "Cancelado" : "Modificado"}
            </Badge>
            <span className="font-display text-[17px] tracking-editorial">
              {aviso.payload.servicio.lugar}
            </span>
            <span className="font-mono text-[11px] text-ash">
              {formatearFecha(aviso.payload.servicio.fechaInicio)}{" "}
              {formatearHora(aviso.payload.servicio.fechaInicio)}
            </span>
          </div>
          {noLeido && (
            <span
              aria-label="No leido"
              className="mt-1.5 h-2 w-2 rounded-full bg-terra shrink-0"
            />
          )}
        </div>

        <div className="mt-2 text-sm text-ash">
          <CuerpoAviso aviso={aviso} />
        </div>

        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider2 text-ash">
          {formatearFecha(aviso.creadaEn)} · {formatearHora(aviso.creadaEn)}
        </p>
      </button>
    </li>
  );
}

function CuerpoAviso({ aviso }: { aviso: NotificacionDTO }): JSX.Element {
  if (aviso.tipo === "SERVICIO_CANCELADO") {
    return <p>El gestor ha cancelado este servicio.</p>;
  }
  const { cambios } = aviso.payload;
  return (
    <ul className="space-y-1">
      {cambios.tipoEvento && (
        <li>
          Tipo de evento: <Tachado>{etiquetaEvento(cambios.tipoEvento.antes)}</Tachado>{" "}
          <Nuevo>{etiquetaEvento(cambios.tipoEvento.despues)}</Nuevo>
        </li>
      )}
      {cambios.uniforme && (
        <li>
          Uniforme: <Tachado>{cambios.uniforme.antes ?? "(sin indicar)"}</Tachado>{" "}
          <Nuevo>{cambios.uniforme.despues ?? "(sin indicar)"}</Nuevo>
        </li>
      )}
      {cambios.notas && (
        <li>
          Notas: <Tachado>{cambios.notas.antes ?? "(sin notas)"}</Tachado>{" "}
          <Nuevo>{cambios.notas.despues ?? "(sin notas)"}</Nuevo>
        </li>
      )}
    </ul>
  );
}

function Tachado({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className="line-through text-ash/70">{children}</span>;
}
function Nuevo({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className="text-ink">→ {children}</span>;
}
