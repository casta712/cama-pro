import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { EstadoServicio, ServicioDTO } from "@cama-pro/shared-types";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";
import { CupoBar } from "./CupoBar.js";
import { etiquetaEvento, formatearFecha, formatearHora } from "../format.js";

interface Props {
  servicio: ServicioDTO;
  accion?: ReactNode;
  destacarAceptado?: boolean;
  /** Si se proporciona, toda la card se vuelve un link al detalle, dejando libres los botones de `accion`. */
  verDetallePath?: string;
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

export function ServicioCard({
  servicio,
  accion,
  destacarAceptado,
  verDetallePath,
}: Props): JSX.Element {
  const { fechaInicio, duracionHoras, lugar, tipoEvento, cuposOcupados, cuposTotales, estado, uniforme, notas, yaAceptado } = servicio;

  return (
    <Card className={["p-5 sm:p-6 relative", verDetallePath ? "hover:border-ink/40 transition-colors" : ""].join(" ")}>
      {verDetallePath && (
        <Link
          to={verDetallePath}
          aria-label={`Ver detalle del servicio del ${formatearFecha(fechaInicio)}`}
          className="absolute inset-0 z-10 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra"
        />
      )}
      {destacarAceptado && yaAceptado && (
        <div className="absolute -top-2 -right-2 z-20">
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

      {accion && <div className="relative z-20 mt-5 flex justify-end">{accion}</div>}
    </Card>
  );
}
