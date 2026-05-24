import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServicioDTO } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { EmptyState } from "../shared/ui/EmptyState.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ServicioCard } from "../shared/ui/ServicioCard.js";
import { ApiError } from "../shared/fetchClient.js";
import { aceptarServicio, listarDisponibles } from "./api.js";

export function ServiciosDisponiblesPage(): JSX.Element {
  const qc = useQueryClient();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["camarero", "disponibles"],
    queryFn: listarDisponibles,
  });

  const aceptar = useMutation({
    mutationFn: aceptarServicio,
    onSuccess: ({ servicio }) => {
      setAviso({ tipo: "ok", texto: `Aceptado. Te esperan en ${servicio.lugar.nombre}.` });
      qc.invalidateQueries({ queryKey: ["camarero"] });
    },
    onError: (err: unknown) => {
      const texto =
        err instanceof ApiError && err.status === 409
          ? "Otro camarero llego antes. Refresca la lista."
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "No se pudo aceptar el servicio";
      setAviso({ tipo: "err", texto });
      qc.invalidateQueries({ queryKey: ["camarero", "disponibles"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Servicios disponibles"
        titulo="Elige tu turno."
        subtitulo="Estos son los servicios publicados con cupos libres. Aceptas, quedas asignado."
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

      {isLoading && <p className="text-ash text-sm">Buscando servicios...</p>}
      {isError && (
        <p className="text-wine text-sm">
          No se pudo cargar la lista: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          titulo="Nada por ahora."
          descripcion="Cuando el gestor publique un nuevo servicio aparecera aqui. Vuelve mas tarde."
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <ServicioCard
              key={s.id}
              servicio={s}
              destacarAceptado
              accion={
                <BotonAceptar
                  servicio={s}
                  pendingId={aceptar.isPending ? aceptar.variables : undefined}
                  onAceptar={(id) => aceptar.mutate(id)}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BotonProps {
  servicio: ServicioDTO;
  pendingId?: string;
  onAceptar: (id: string) => void;
}

function BotonAceptar({ servicio, pendingId, onAceptar }: BotonProps): JSX.Element {
  if (servicio.yaAceptado) {
    return (
      <span className="text-xs font-mono uppercase tracking-wider2 text-sage">
        ya aceptado
      </span>
    );
  }
  return (
    <Button
      tamano="sm"
      loading={pendingId === servicio.id}
      onClick={() => onAceptar(servicio.id)}
    >
      Aceptar
    </Button>
  );
}
