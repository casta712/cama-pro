import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServicioDTO } from "@cama-pro/shared-types";
import { useAuth } from "../auth/AuthContext.js";
import { aceptarServicio, mensajeErrorAceptar } from "../camarero/api.js";
import {
  cancelarServicio,
  listarAsignacionesServicio,
} from "../gestor/api.js";
import { Badge } from "./ui/Badge.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { CupoBar } from "./ui/CupoBar.js";
import { PageHeader } from "./ui/PageHeader.js";
import {
  etiquetaEvento,
  formatearFechaLarga,
  formatearHora,
} from "./format.js";
import { obtenerServicio } from "./serviciosApi.js";

const TONO_ESTADO: Record<
  ServicioDTO["estado"],
  "verde" | "ambar" | "terra" | "neutro" | "wine"
> = {
  PUBLICADO: "ambar",
  CUBIERTO: "verde",
  EN_CURSO: "terra",
  FINALIZADO: "neutro",
  CANCELADO: "wine",
};

const ETIQUETA_ESTADO: Record<ServicioDTO["estado"], string> = {
  PUBLICADO: "publicado",
  CUBIERTO: "cubierto",
  EN_CURSO: "en curso",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado",
};

export function DetalleServicioPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["servicio", id],
    queryFn: () => obtenerServicio(id!),
    enabled: Boolean(id),
  });

  if (!id) {
    return <ErrorBox texto="Falta el identificador del servicio." />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 text-xs font-mono uppercase tracking-wider2 text-ash hover:text-terra"
      >
        ← Volver
      </button>

      {isLoading && <p className="text-ash text-sm">Cargando servicio...</p>}
      {isError && (
        <ErrorBox
          texto={`No se pudo cargar el servicio: ${(error as Error).message}`}
        />
      )}

      {data && (
        <Detalle
          servicio={data}
          esGestor={usuario?.rol === "GESTOR"}
          esCamarero={usuario?.rol === "CAMARERO"}
          onCambio={() => refetch()}
        />
      )}
    </div>
  );
}

interface DetalleProps {
  servicio: ServicioDTO;
  esGestor: boolean;
  esCamarero: boolean;
  onCambio: () => void;
}

function Detalle({
  servicio,
  esGestor,
  esCamarero,
  onCambio,
}: DetalleProps): JSX.Element {
  const qc = useQueryClient();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "err"; texto: string } | null>(
    null,
  );

  const cancelarMut = useMutation({
    mutationFn: cancelarServicio,
    onSuccess: () => {
      setAviso({ tipo: "ok", texto: "Servicio cancelado." });
      qc.invalidateQueries({ queryKey: ["gestor"] });
      onCambio();
    },
    onError: (err: unknown) =>
      setAviso({
        tipo: "err",
        texto:
          err instanceof Error ? err.message : "No se pudo cancelar el servicio",
      }),
  });

  const aceptarMut = useMutation({
    mutationFn: aceptarServicio,
    onSuccess: () => {
      setAviso({
        tipo: "ok",
        texto: `Aceptado. Te esperan en ${servicio.lugar.nombre}.`,
      });
      qc.invalidateQueries({ queryKey: ["camarero"] });
      onCambio();
    },
    onError: (err: unknown) => {
      setAviso({ tipo: "err", texto: mensajeErrorAceptar(err) });
    },
  });

  const puedeCancelar =
    esGestor &&
    (servicio.estado === "PUBLICADO" || servicio.estado === "CUBIERTO");
  const puedeEditar = esGestor && servicio.estado === "PUBLICADO";
  const puedeAceptar =
    esCamarero && servicio.estado === "PUBLICADO" && !servicio.yaAceptado;

  return (
    <article className="animate-fadeIn">
      <PageHeader
        eyebrow="Detalle del servicio"
        titulo={etiquetaEvento(servicio.tipoEvento)}
      />

      {aviso && (
        <div
          role="alert"
          className={[
            "mb-6 px-4 py-3 rounded-card text-sm border",
            aviso.tipo === "ok"
              ? "bg-sage/10 text-sage border-sage/30"
              : "bg-wine/5 text-wine border-wine/30",
          ].join(" ")}
        >
          {aviso.texto}
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider2 text-ash">
              {formatearFechaLarga(servicio.fechaInicio)}
            </p>
            <p className="font-display text-2xl tracking-editorial mt-1">
              {formatearHora(servicio.fechaInicio)}{" "}
              <span className="text-ash text-base">· {servicio.duracionHoras}h</span>
            </p>
          </div>
          <Badge tono={TONO_ESTADO[servicio.estado]}>
            {ETIQUETA_ESTADO[servicio.estado]}
          </Badge>
        </div>

        <Dato etiqueta="lugar">
          <span className="font-medium text-ink">{servicio.lugar.nombre}</span>
          <span className="block text-ash text-sm mt-0.5">
            {servicio.lugar.direccion}
          </span>
        </Dato>

        <div className="mt-5">
          <p className="font-mono uppercase tracking-wider2 text-[10px] text-ash mb-2">
            cupos
          </p>
          <CupoBar
            ocupados={servicio.cuposOcupados}
            totales={servicio.cuposTotales}
          />
        </div>

        {servicio.uniforme && (
          <Dato etiqueta="uniforme" className="mt-5">
            <span className="text-ink">{servicio.uniforme}</span>
          </Dato>
        )}

        {servicio.notas && (
          <Dato etiqueta="notas" className="mt-5">
            <span className="text-ink whitespace-pre-line">{servicio.notas}</span>
          </Dato>
        )}

        {esCamarero && servicio.yaAceptado && (
          <p className="mt-6 text-sm font-mono uppercase tracking-wider2 text-sage">
            ya aceptado
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2 justify-end">
          {puedeAceptar && (
            <Button
              loading={aceptarMut.isPending}
              onClick={() => aceptarMut.mutate(servicio.id)}
            >
              Aceptar servicio
            </Button>
          )}
          {puedeEditar && (
            <Link to={`/gestor/servicios/${servicio.id}/editar`}>
              <Button variante="outline">Editar</Button>
            </Link>
          )}
          {puedeCancelar && (
            <Button
              variante="danger"
              loading={cancelarMut.isPending}
              onClick={() => {
                if (window.confirm("Cancelar este servicio?")) {
                  cancelarMut.mutate(servicio.id);
                }
              }}
            >
              Cancelar servicio
            </Button>
          )}
        </div>
      </Card>

      {esGestor && servicio.cuposOcupados > 0 && (
        <EquipoPanel servicioId={servicio.id} />
      )}
    </article>
  );
}

function Dato({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      <p className="font-mono uppercase tracking-wider2 text-[10px] text-ash mb-1">
        {etiqueta}
      </p>
      {children}
    </div>
  );
}

function EquipoPanel({ servicioId }: { servicioId: string }): JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gestor", "asignaciones", servicioId],
    queryFn: () => listarAsignacionesServicio(servicioId),
  });

  return (
    <Card className="mt-6 p-6 sm:p-8">
      <p className="eyebrow mb-4">Equipo asignado</p>
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
            <li
              key={a.id}
              className="py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{a.nombre}</p>
                <p className="text-xs text-ash">
                  <a
                    href={`mailto:${a.email}`}
                    className="hover:text-terra underline-offset-2 hover:underline"
                  >
                    {a.email}
                  </a>
                  {" · "}
                  <a
                    href={`tel:${a.telefono}`}
                    className="font-mono hover:text-terra underline-offset-2 hover:underline"
                  >
                    {a.telefono}
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ErrorBox({ texto }: { texto: string }): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <p className="text-wine text-sm">{texto}</p>
    </div>
  );
}
