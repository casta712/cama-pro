import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CrearServicioInput } from "@cama-pro/shared-types";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ApiError } from "../shared/fetchClient.js";
import { crearServicio } from "./api.js";
import {
  ServicioFormulario,
  valoresACrearInput,
  type ServicioFormularioValores,
} from "./ServicioFormulario.js";

export function CrearServicioPage(): JSX.Element {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGlobal, setErrorGlobal] = useState<string | undefined>();

  const crear = useMutation({
    mutationFn: crearServicio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gestor", "servicios"] });
      navigate("/gestor/servicios");
    },
    onError: (err: unknown) => {
      setErrorGlobal(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo crear el servicio",
      );
    },
  });

  const onSubmit = (valores: ServicioFormularioValores): void => {
    setErrores({});
    setErrorGlobal(undefined);

    const candidato = valoresACrearInput(valores);
    if ("error" in candidato) {
      setErrores(candidato.error);
      return;
    }

    const parsed = CrearServicioInput.safeParse(candidato);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrores(errs);
      return;
    }

    crear.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Nuevo servicio"
        titulo="Publicar."
        subtitulo="Define la fecha, el lugar y cuantos camareros necesitas. Cuando publiques, el equipo lo vera al instante."
      />
      <ServicioFormulario
        modo="crear"
        enviando={crear.isPending}
        errorGlobal={errorGlobal}
        errores={errores}
        onSubmit={onSubmit}
        onCancelar={() => navigate("/gestor/servicios")}
      />
    </div>
  );
}
