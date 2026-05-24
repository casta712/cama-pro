import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EditarServicioInput as EditarServicioSchema,
  type EditarServicioInput,
  type ServicioDTO,
} from "@cama-pro/shared-types";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ApiError } from "../shared/fetchClient.js";
import { editarServicio, listarServiciosGestor } from "./api.js";
import {
  ANTELACION_MINIMA_HORAS,
  ServicioFormulario,
  isoAFechaHoraLocal,
  type ServicioFormularioValores,
} from "./ServicioFormulario.js";

const HORA_MS = 60 * 60 * 1000;

function servicioAValores(s: ServicioDTO): ServicioFormularioValores {
  const { fecha, hora } = isoAFechaHoraLocal(s.fechaInicio);
  return {
    fecha,
    hora,
    duracionHoras: String(s.duracionHoras),
    lugarNombre: s.lugar.nombre,
    lugarDireccion: s.lugar.direccion,
    tipoEvento: s.tipoEvento,
    cuposTotales: String(s.cuposTotales),
    uniforme: s.uniforme ?? "",
    notas: s.notas ?? "",
  };
}

/**
 * Compara los valores actuales del form con los originales del servicio y
 * devuelve solo los campos que han cambiado, en el formato que espera la API.
 * Asi evitamos enviar campos duros sin cambio que el backend rechazaria si
 * hay asignaciones.
 */
function calcularCambios(
  original: ServicioDTO,
  ahora: ServicioFormularioValores,
): EditarServicioInput {
  const cambios: EditarServicioInput = {};

  const fechaIsoNueva = new Date(`${ahora.fecha}T${ahora.hora}:00`).toISOString();
  if (fechaIsoNueva !== original.fechaInicio) {
    cambios.fechaInicio = fechaIsoNueva;
  }

  const duracion = Number(ahora.duracionHoras);
  if (duracion !== original.duracionHoras) {
    cambios.duracionHoras = duracion;
  }

  if (
    ahora.lugarNombre !== original.lugar.nombre ||
    ahora.lugarDireccion !== original.lugar.direccion
  ) {
    cambios.lugar = { nombre: ahora.lugarNombre, direccion: ahora.lugarDireccion };
  }

  if (ahora.tipoEvento && ahora.tipoEvento !== original.tipoEvento) {
    cambios.tipoEvento = ahora.tipoEvento;
  }

  const cupos = Number(ahora.cuposTotales);
  if (cupos !== original.cuposTotales) {
    cambios.cuposTotales = cupos;
  }

  const uniformeNuevo = ahora.uniforme.trim() ? ahora.uniforme : null;
  if (uniformeNuevo !== (original.uniforme ?? null)) {
    cambios.uniforme = uniformeNuevo;
  }

  const notasNuevas = ahora.notas.trim() ? ahora.notas : null;
  if (notasNuevas !== (original.notas ?? null)) {
    cambios.notas = notasNuevas;
  }

  return cambios;
}

export function EditarServicioPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGlobal, setErrorGlobal] = useState<string | undefined>();

  const { data: lista, isLoading, isError, error } = useQuery({
    queryKey: ["gestor", "servicios", ""],
    queryFn: () => listarServiciosGestor(),
  });

  const servicio = useMemo(
    () => lista?.find((s) => s.id === id) ?? null,
    [lista, id],
  );

  const editar = useMutation({
    mutationFn: (cambios: EditarServicioInput) => editarServicio(id!, cambios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor", "servicios"] });
      qc.invalidateQueries({ queryKey: ["gestor", "asignaciones", id] });
      navigate("/gestor/servicios");
    },
    onError: (err: unknown) => {
      setErrorGlobal(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo guardar el cambio",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-ash text-sm">
        Cargando servicio...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-wine text-sm">
        No se pudo cargar: {(error as Error).message}
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <PageHeader eyebrow="Editar" titulo="Servicio no encontrado." />
        <button
          onClick={() => navigate("/gestor/servicios")}
          className="text-sm font-mono uppercase tracking-wider2 text-ink hover:text-terra"
        >
          volver a servicios
        </button>
      </div>
    );
  }

  const conAsignaciones = servicio.cuposOcupados > 0;

  const onSubmit = (valores: ServicioFormularioValores): void => {
    setErrores({});
    setErrorGlobal(undefined);

    if (!valores.fecha || !valores.hora) {
      setErrores({ fecha: "Fecha y hora requeridas" });
      return;
    }
    if (!valores.tipoEvento) {
      setErrores({ tipoEvento: "Selecciona un tipo" });
      return;
    }

    const cambios = calcularCambios(servicio, valores);

    if (Object.keys(cambios).length === 0) {
      setErrorGlobal("No has cambiado nada");
      return;
    }

    if (cambios.fechaInicio) {
      const fechaMs = new Date(cambios.fechaInicio).getTime();
      if (fechaMs < Date.now() + ANTELACION_MINIMA_HORAS * HORA_MS) {
        setErrores({
          fecha: `Minimo ${ANTELACION_MINIMA_HORAS}h de antelacion`,
        });
        return;
      }
    }

    const parsed = EditarServicioSchema.safeParse(cambios);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrores(errs);
      return;
    }

    editar.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Editar servicio"
        titulo="Actualizar."
        subtitulo={
          conAsignaciones
            ? "Hay camareros que ya aceptaron este servicio: solo puedes ajustar tipo de evento, uniforme y notas."
            : "Nadie lo ha aceptado todavia, puedes cambiar lo que necesites."
        }
      />
      <ServicioFormulario
        modo="editar"
        valoresIniciales={servicioAValores(servicio)}
        bloquearCamposDuros={conAsignaciones}
        mensajeBloqueo={
          conAsignaciones
            ? `${servicio.cuposOcupados} camarero(s) ya aceptaron. Fecha, hora, duracion, lugar y cupos quedan bloqueados.`
            : undefined
        }
        enviando={editar.isPending}
        errorGlobal={errorGlobal}
        errores={errores}
        onSubmit={onSubmit}
        onCancelar={() => navigate("/gestor/servicios")}
      />
    </div>
  );
}
