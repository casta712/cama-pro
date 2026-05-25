import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CambiarPasswordInput } from "@cama-pro/shared-types";
import { useAuth } from "./AuthContext.js";
import { cambiarPasswordRequest } from "./api.js";
import { Button } from "../shared/ui/Button.js";
import { Card } from "../shared/ui/Card.js";
import { Input } from "../shared/ui/Input.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { ApiError } from "../shared/fetchClient.js";

interface ErroresForm {
  passwordActual?: string;
  passwordNueva?: string;
  passwordConfirmacion?: string;
  global?: string;
}

export function CuentaPage(): JSX.Element {
  const { usuario } = useAuth();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [errores, setErrores] = useState<ErroresForm>({});
  const [exito, setExito] = useState(false);

  const mut = useMutation({
    mutationFn: cambiarPasswordRequest,
    onSuccess: () => {
      setExito(true);
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmacion("");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.code === "CREDENCIALES_INVALIDAS") {
          setErrores({ passwordActual: "La contrasena actual no es correcta" });
          return;
        }
        if (err.code === "PASSWORD_IGUAL_A_LA_ACTUAL") {
          setErrores({ passwordNueva: "La nueva no puede ser igual a la actual" });
          return;
        }
      }
      setErrores({
        global: err instanceof Error ? err.message : "No se pudo cambiar la contrasena",
      });
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setErrores({});
    setExito(false);

    const errs: ErroresForm = {};
    if (passwordActual.length === 0) {
      errs.passwordActual = "Indica tu contrasena actual";
    }
    if (passwordNueva.length < 8) {
      errs.passwordNueva = "Minimo 8 caracteres";
    }
    if (passwordNueva !== passwordConfirmacion) {
      errs.passwordConfirmacion = "Las contrasenas no coinciden";
    }
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }

    const parsed = CambiarPasswordInput.safeParse({
      passwordActual,
      passwordNueva,
    });
    if (!parsed.success) {
      setErrores({ global: "Datos no validos" });
      return;
    }
    mut.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Mi cuenta"
        titulo="Tu acceso."
        subtitulo="Cambia la contrasena con la que entras a Cama-Pro."
      />

      {usuario && (
        <p className="font-mono text-xs uppercase tracking-wider2 text-ash mb-6">
          {usuario.rol.toLowerCase()} · {usuario.email}
        </p>
      )}

      <Card className="p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-editorial mb-6">
          Cambiar contrasena
        </h2>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Input
            label="Contrasena actual"
            type="password"
            autoComplete="current-password"
            required
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            error={errores.passwordActual}
          />
          <Input
            label="Nueva contrasena"
            type="password"
            autoComplete="new-password"
            required
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            error={errores.passwordNueva}
            hint="Minimo 8 caracteres"
          />
          <Input
            label="Confirma la nueva"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirmacion}
            onChange={(e) => setPasswordConfirmacion(e.target.value)}
            error={errores.passwordConfirmacion}
          />

          {errores.global && (
            <div
              role="alert"
              className="border border-wine/40 bg-wine/5 text-wine text-sm px-3 py-2 rounded-card"
            >
              {errores.global}
            </div>
          )}

          {exito && (
            <div
              role="status"
              className="border border-sage/40 bg-sage/10 text-sage text-sm px-3 py-2 rounded-card"
            >
              Contrasena actualizada. La proxima vez que inicies sesion usa la nueva.
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={mut.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
