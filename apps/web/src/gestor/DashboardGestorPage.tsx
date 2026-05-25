import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Badge } from "../shared/ui/Badge.js";
import { Button } from "../shared/ui/Button.js";
import { CupoBar } from "../shared/ui/CupoBar.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import {
  diasDeLaSemana,
  etiquetaEvento,
  formatearHora,
  mismoDiaCalendario,
  nombreDiaCorto,
  nombreDiaLargo,
  nombreMes,
} from "../shared/format.js";
import { listarCamareros, listarServiciosGestor } from "./api.js";

const TONO_ESTADO: Record<EstadoServicio, "verde" | "ambar" | "terra" | "neutro" | "wine"> = {
  PUBLICADO: "ambar",
  CUBIERTO: "verde",
  EN_CURSO: "terra",
  FINALIZADO: "neutro",
  CANCELADO: "wine",
};

const ETIQUETA_ESTADO: Record<EstadoServicio, string> = {
  PUBLICADO: "publicado",
  CUBIERTO: "cubierto",
  EN_CURSO: "en curso",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado",
};

const MAX_FILAS_LISTA = 5;

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DashboardGestorPage(): JSX.Element {
  const servicios = useQuery({
    queryKey: ["gestor", "servicios", ""],
    queryFn: () => listarServiciosGestor(),
  });
  const pendientes = useQuery({
    queryKey: ["gestor", "camareros", "PENDIENTE_APROBACION"],
    queryFn: () => listarCamareros("PENDIENTE_APROBACION"),
  });
  const activos = useQuery({
    queryKey: ["gestor", "camareros", "ACTIVO"],
    queryFn: () => listarCamareros("ACTIVO"),
  });

  const ahora = useMemo(() => new Date(), []);
  const semana = useMemo(() => diasDeLaSemana(ahora), [ahora]);

  const serviciosActivos = useMemo(
    () =>
      (servicios.data ?? [])
        .filter((s) => s.estado === "PUBLICADO" || s.estado === "CUBIERTO")
        .sort(
          (a, b) =>
            new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
        ),
    [servicios.data],
  );

  const conteoPorDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of serviciosActivos) {
      const k = new Date(s.fechaInicio).toDateString();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [serviciosActivos]);

  const stats = useMemo(() => {
    const todos = servicios.data ?? [];
    return {
      publicados: todos.filter((s) => s.estado === "PUBLICADO").length,
      cubiertos: todos.filter((s) => s.estado === "CUBIERTO").length,
      activos: activos.data?.length ?? 0,
    };
  }, [servicios.data, activos.data]);

  const nPendientes = pendientes.data?.length ?? 0;

  const eyebrowHeader = `${capitalizar(nombreDiaLargo(ahora))} ${ahora.getDate()} de ${nombreMes(ahora)} · Panel del gestor`;

  return (
    <>
      {nPendientes > 0 && (
        <div className="bg-wine text-bone animate-fadeIn">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3 flex-wrap min-w-0">
              <span className="font-mono uppercase text-[10px] tracking-wider2 text-bone/70 shrink-0">
                Accion requerida
              </span>
              <span className="text-sm">
                {nPendientes} camarero{nPendientes === 1 ? "" : "s"} esperan aprobacion — no pueden aceptar servicios
              </span>
            </div>
            <Link
              to="/gestor/camareros"
              className="inline-flex items-center justify-center h-9 px-3 text-xs font-mono uppercase tracking-wider2 rounded-card border border-bone/40 text-bone hover:bg-bone/10 transition-colors whitespace-nowrap shrink-0"
            >
              Aprobar ahora →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <PageHeader
          eyebrow={eyebrowHeader}
          titulo="Esta semana."
          accion={
            <Link to="/gestor/servicios/nuevo">
              <Button>Nuevo servicio</Button>
            </Link>
          }
        />

        <section aria-label="Resumen semanal" className="mb-8">
          <div className="grid grid-cols-7 gap-1.5">
            {semana.map((d) => (
              <DiaCell
                key={d.toISOString()}
                fecha={d}
                esHoy={mismoDiaCalendario(d, ahora)}
                count={conteoPorDia.get(d.toDateString()) ?? 0}
              />
            ))}
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-6">
          <main className="flex-1 min-w-0">
            {servicios.isLoading && (
              <p className="text-sm text-ash">Cargando servicios...</p>
            )}
            {servicios.isError && (
              <p className="text-sm text-wine">
                No se pudo cargar la lista: {(servicios.error as Error).message}
              </p>
            )}
            {servicios.data && serviciosActivos.length === 0 && (
              <EmptyState
                titulo="Sin servicios activos."
                descripcion="Publica un nuevo servicio para que aparezca aqui."
                accion={
                  <Link to="/gestor/servicios/nuevo">
                    <Button>Publicar el primero</Button>
                  </Link>
                }
              />
            )}
            {serviciosActivos.length > 0 && (
              <div className="flex flex-col gap-3 animate-fadeIn">
                {serviciosActivos.slice(0, MAX_FILAS_LISTA).map((s) => (
                  <FilaServicio key={s.id} servicio={s} />
                ))}
                {serviciosActivos.length > MAX_FILAS_LISTA && (
                  <Link
                    to="/gestor/servicios"
                    className="self-end text-xs font-mono uppercase tracking-wider2 text-ash hover:text-terra mt-1"
                  >
                    Ver los {serviciosActivos.length} servicios →
                  </Link>
                )}
              </div>
            )}
          </main>

          <aside className="lg:w-72 lg:shrink-0 flex flex-col gap-3">
            <StatCard label="Publicados" valor={stats.publicados} colorValor="text-terra" />
            <StatCard label="Cubiertos" valor={stats.cubiertos} colorValor="text-sage" />
            <StatCard label="Camareros activos" valor={stats.activos} colorValor="text-ink" />

            <div className="bg-cream/60 border border-line rounded-card p-4 mt-1">
              <p className="eyebrow mb-3">Accesos rapidos</p>
              <div className="flex flex-col gap-2">
                <Link to="/gestor/servicios/nuevo">
                  <Button className="w-full">+ Nuevo servicio</Button>
                </Link>
                <Link to="/gestor/camareros">
                  <Button variante="outline" className="w-full">
                    Ver todos los camareros
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

interface DiaCellProps {
  fecha: Date;
  esHoy: boolean;
  count: number;
}

function DiaCell({ fecha, esHoy, count }: DiaCellProps): JSX.Element {
  return (
    <div
      className={[
        "flex flex-col items-center gap-1.5 rounded-card border p-2 sm:p-3 transition-colors",
        esHoy ? "bg-ink text-bone border-ink" : "bg-cream/60 border-line text-ink",
      ].join(" ")}
    >
      <span
        className={[
          "font-mono text-[9px] uppercase tracking-wider2",
          esHoy ? "text-bone/70" : "text-ash",
        ].join(" ")}
      >
        {nombreDiaCorto(fecha)}
      </span>
      <span className="font-display text-[22px] sm:text-[28px] tracking-editorial leading-none">
        {fecha.getDate()}
      </span>
      {count > 0 ? (
        <Badge tono={esHoy ? "terra" : "ambar"}>{count} serv.</Badge>
      ) : (
        <span
          className={[
            "text-[9px] font-mono uppercase tracking-wider2",
            esHoy ? "text-bone/50" : "text-ash",
          ].join(" ")}
        >
          libre
        </span>
      )}
    </div>
  );
}

function FilaServicio({ servicio }: { servicio: ServicioDTO }): JSX.Element {
  const fecha = new Date(servicio.fechaInicio);
  const puedeEditar = servicio.estado === "PUBLICADO";

  return (
    <div className="bg-bone border border-line rounded-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:border-ink/30">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <DateChip fecha={fecha} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-[19px] tracking-editorial leading-tight">
              {etiquetaEvento(servicio.tipoEvento)}
            </span>
            <Badge tono={TONO_ESTADO[servicio.estado]}>
              {ETIQUETA_ESTADO[servicio.estado]}
            </Badge>
          </div>
          <p className="text-xs text-ash mt-0.5 truncate">
            {servicio.lugar.nombre} · {servicio.duracionHoras}h
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:shrink-0">
        <div className="flex-1 sm:w-32">
          <CupoBar
            ocupados={servicio.cuposOcupados}
            totales={servicio.cuposTotales}
          />
        </div>
        {puedeEditar && (
          <Link to={`/gestor/servicios/${servicio.id}/editar`}>
            <Button variante="ghost" tamano="sm">
              Editar
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function DateChip({ fecha }: { fecha: Date }): JSX.Element {
  return (
    <div className="bg-cream border border-line rounded-card px-2.5 py-2 min-w-[68px] text-center shrink-0">
      <p className="font-mono text-[10px] uppercase tracking-wider2 text-ash">
        {nombreDiaCorto(fecha)} {fecha.getDate()}
      </p>
      <p className="font-mono text-[13px] text-ink mt-0.5">
        {formatearHora(fecha.toISOString())}
      </p>
    </div>
  );
}

interface StatProps {
  label: string;
  valor: number;
  colorValor: string;
}

function StatCard({ label, valor, colorValor }: StatProps): JSX.Element {
  return (
    <div className="flex justify-between items-center bg-cream/60 border border-line rounded-card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p
        className={[
          "font-display text-[34px] tracking-editorial leading-none",
          colorValor,
        ].join(" ")}
      >
        {valor}
      </p>
    </div>
  );
}
