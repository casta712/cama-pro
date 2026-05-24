import type { ReactNode } from "react";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";
import { etiquetaEvento, formatearFecha, formatearHora } from "../format.js";

interface Props {
  servicio: ServicioDTO;
  accion?: ReactNode;
  destacarAceptado?: boolean;
}

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

export function ServicioCard({ servicio, accion, destacarAceptado }: Props): JSX.Element {
  const { fechaInicio, duracionHoras, lugar, tipoEvento, cuposOcupados, cuposTotales, estado, uniforme, notas, yaAceptado } = servicio;

  return (
    <Card className="p-5 sm:p-6 relative">
      {destacarAceptado && yaAceptado && (
        <div className="absolute -top-2 -right-2">
          <Badge tono="terra">aceptado</Badge>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider2 text-ash">
            {formatearFecha(fechaInicio)} &middot; {formatearHora(fechaInicio)} &middot; {duracionHoras}h
          </p>
          <h3 className="font-display text-2xl tracking-editorial leading-tight mt-1">
            {etiquetaEvento(tipoEvento)}
          </h3>
          <p className="text-sm text-ink mt-1">
            <span className="font-medium">{lugar.nombre}</span>
            <span className="text-ash"> &middot; {lugar.direccion}</span>
          </p>
        </div>
        <Badge tono={TONO_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>
      </div>

      <CupoBar ocupados={cuposOcupados} totales={cuposTotales} />

      {(uniforme || notas) && (
        <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-sm text-ash">
          {uniforme && (
            <p>
              <span className="font-mono uppercase tracking-wider2 text-[10px] text-ink mr-2">uniforme</span>
              {uniforme}
            </p>
          )}
          {notas && (
            <p>
              <span className="font-mono uppercase tracking-wider2 text-[10px] text-ink mr-2">notas</span>
              {notas}
            </p>
          )}
        </div>
      )}

      {accion && <div className="mt-5 flex justify-end">{accion}</div>}
    </Card>
  );
}

function CupoBar({ ocupados, totales }: { ocupados: number; totales: number }): JSX.Element {
  const pct = totales === 0 ? 0 : (ocupados / totales) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-mono uppercase tracking-wider2 text-ash">cupos</span>
        <span className="text-sm font-mono text-ink">
          {ocupados}<span className="text-ash">/{totales}</span>
        </span>
      </div>
      <div className="h-1 bg-line rounded-card overflow-hidden">
        <div
          className="h-full bg-terra transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={ocupados}
          aria-valuemin={0}
          aria-valuemax={totales}
        />
      </div>
    </div>
  );
}
