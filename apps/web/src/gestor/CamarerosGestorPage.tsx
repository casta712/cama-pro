import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CamareroDTO, EstadoCuentaCamarero } from "@cama-pro/shared-types";
import { Badge } from "../shared/ui/Badge.js";
import { Button } from "../shared/ui/Button.js";
import { Card } from "../shared/ui/Card.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { formatearFechaLarga } from "../shared/format.js";
import { aprobarCamarero, listarCamareros, suspenderCamarero } from "./api.js";

interface FiltroOpcion {
  value: "" | EstadoCuentaCamarero;
  label: string;
}

const FILTROS: ReadonlyArray<FiltroOpcion> = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE_APROBACION", label: "Pendientes" },
  { value: "ACTIVO", label: "Activos" },
  { value: "SUSPENDIDO", label: "Suspendidos" },
];

const TONO: Record<EstadoCuentaCamarero, "ambar" | "verde" | "wine"> = {
  PENDIENTE_APROBACION: "ambar",
  ACTIVO: "verde",
  SUSPENDIDO: "wine",
};

const ETIQUETA: Record<EstadoCuentaCamarero, string> = {
  PENDIENTE_APROBACION: "pendiente",
  ACTIVO: "activo",
  SUSPENDIDO: "suspendido",
};

export function CamarerosGestorPage(): JSX.Element {
  const [filtro, setFiltro] = useState<"" | EstadoCuentaCamarero>("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["gestor", "camareros", filtro],
    queryFn: () => listarCamareros(filtro || undefined),
  });

  const aprobar = useMutation({
    mutationFn: aprobarCamarero,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gestor", "camareros"] }),
  });

  const suspender = useMutation({
    mutationFn: suspenderCamarero,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gestor", "camareros"] }),
  });

  const toggleExpandir = (id: string): void => {
    setExpandido((actual) => (actual === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Panel del gestor"
        titulo="Camareros."
        subtitulo="Aprueba a quienes se han registrado para poder aceptar servicios, o suspende a los que dejen de estar disponibles."
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

      {isLoading && <p className="text-ash text-sm">Cargando camareros...</p>}

      {data && data.length === 0 && (
        <EmptyState
          titulo="Sin camareros."
          descripcion="Cuando alguien se registre en la plataforma, aparecera aqui para que lo apruebes."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((c) => (
            <FilaCamarero
              key={c.id}
              camarero={c}
              expandido={expandido === c.id}
              onToggle={() => toggleExpandir(c.id)}
              onAprobar={() => aprobar.mutate(c.id)}
              onSuspender={() => suspender.mutate(c.id)}
              pendingAprobar={aprobar.isPending && aprobar.variables === c.id}
              pendingSuspender={suspender.isPending && suspender.variables === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilaProps {
  camarero: CamareroDTO;
  expandido: boolean;
  onToggle: () => void;
  onAprobar: () => void;
  onSuspender: () => void;
  pendingAprobar: boolean;
  pendingSuspender: boolean;
}

function FilaCamarero({
  camarero,
  expandido,
  onToggle,
  onAprobar,
  onSuspender,
  pendingAprobar,
  pendingSuspender,
}: FilaProps): JSX.Element {
  const detalleId = `camarero-${camarero.id}-detalle`;
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expandido}
        aria-controls={detalleId}
        className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-cream/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-display text-xl tracking-editorial truncate">{camarero.nombre}</h3>
            <Badge tono={TONO[camarero.estadoCuenta]}>{ETIQUETA[camarero.estadoCuenta]}</Badge>
          </div>
          <p className="text-sm text-ash truncate">
            {camarero.email} &middot; <span className="font-mono">{camarero.telefono}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-ash">
          <span className="font-mono text-[10px] uppercase tracking-wider2">
            {expandido ? "cerrar" : "ver ficha"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`transition-transform ${expandido ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      </button>

      {expandido && (
        <div
          id={detalleId}
          className="border-t border-line bg-bone/60 p-4 sm:p-6 animate-fadeIn"
        >
          <p className="eyebrow mb-2">Presentacion</p>
          {camarero.bio.trim() ? (
            <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">
              {camarero.bio}
            </p>
          ) : (
            <p className="text-sm italic text-ash">
              Sin presentacion (perfil creado antes de exigirla)
            </p>
          )}

          <div className="mt-5 pt-5 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Dato eyebrow="Email" valor={camarero.email} />
            <Dato eyebrow="Telefono" valor={camarero.telefono} mono />
            <Dato eyebrow="Solicitud" valor={formatearFechaLarga(camarero.creadoEn)} />
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {camarero.estadoCuenta === "PENDIENTE_APROBACION" && (
              <Button tamano="sm" onClick={onAprobar} loading={pendingAprobar}>
                Aprobar solicitud
              </Button>
            )}
            {camarero.estadoCuenta === "ACTIVO" && (
              <Button tamano="sm" variante="outline" onClick={onSuspender} loading={pendingSuspender}>
                Suspender
              </Button>
            )}
            {camarero.estadoCuenta === "SUSPENDIDO" && (
              <Button tamano="sm" variante="outline" onClick={onAprobar} loading={pendingAprobar}>
                Reactivar
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Dato({ eyebrow, valor, mono }: { eyebrow: string; valor: string; mono?: boolean }): JSX.Element {
  return (
    <div>
      <p className="eyebrow mb-1">{eyebrow}</p>
      <p className={mono ? "font-mono text-ink" : "text-ink"}>{valor}</p>
    </div>
  );
}
