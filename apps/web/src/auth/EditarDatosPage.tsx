import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditarPerfilCamareroInput } from "@cama-pro/shared-types";
import { useAuth } from "./AuthContext.js";
import {
  editarMiCamarero,
  obtenerMiCamarero,
} from "../camarero/api.js";
import { Button } from "../shared/ui/Button.js";
import { Card } from "../shared/ui/Card.js";
import { Input } from "../shared/ui/Input.js";
import { PageHeader } from "../shared/ui/PageHeader.js";
import { Textarea } from "../shared/ui/Textarea.js";
import { ApiError } from "../shared/fetchClient.js";

const BIO_MIN = 30;
const BIO_MAX = 1000;

interface Errores {
  nombre?: string;
  telefono?: string;
  bio?: string;
  global?: string;
}

export function EditarDatosPage(): JSX.Element {
  const { usuario } = useAuth();
  if (usuario?.rol === "GESTOR") {
    return <VistaGestor email={usuario.email} />;
  }
  return <FormCamarero />;
}

function FormCamarero(): JSX.Element {
  const qc = useQueryClient();
  const camarero = useQuery({
    queryKey: ["camarero", "me"],
    queryFn: obtenerMiCamarero,
  });

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [bio, setBio] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (camarero.data) {
      setNombre(camarero.data.nombre);
      setTelefono(camarero.data.telefono);
      setBio(camarero.data.bio);
    }
  }, [camarero.data]);

  const mut = useMutation({
    mutationFn: editarMiCamarero,
    onSuccess: (data) => {
      qc.setQueryData(["camarero", "me"], data);
      setExito(true);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.code === "NOMBRE_INVALIDO")
          return setErrores({ nombre: "Entre 2 y 80 caracteres" });
        if (err.code === "TELEFONO_INVALIDO")
          return setErrores({ telefono: "Entre 6 y 20 caracteres" });
        if (err.code === "BIO_INVALIDA")
          return setErrores({ bio: `Entre ${BIO_MIN} y ${BIO_MAX} caracteres` });
      }
      setErrores({
        global: err instanceof Error ? err.message : "No se pudo guardar",
      });
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setErrores({});
    setExito(false);

    if (!camarero.data) return;
    // Solo envia campos que han cambiado para no disparar validaciones
    // innecesarias en campos heredados (p.ej. bio "" en cuentas anteriores
    // a la regla de longitud minima).
    const cambios: { nombre?: string; telefono?: string; bio?: string } = {};
    if (nombre !== camarero.data.nombre) cambios.nombre = nombre;
    if (telefono !== camarero.data.telefono) cambios.telefono = telefono;
    if (bio !== camarero.data.bio) cambios.bio = bio;

    if (Object.keys(cambios).length === 0) {
      setErrores({ global: "No has cambiado ningun dato" });
      return;
    }

    const parsed = EditarPerfilCamareroInput.safeParse(cambios);
    if (!parsed.success) {
      const errs: Errores = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0];
        if (campo === "nombre") errs.nombre = "Entre 2 y 80 caracteres";
        if (campo === "telefono") errs.telefono = "Entre 6 y 20 caracteres";
        if (campo === "bio")
          errs.bio = `Entre ${BIO_MIN} y ${BIO_MAX} caracteres`;
      }
      setErrores(errs);
      return;
    }

    mut.mutate(parsed.data);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Mi cuenta"
        titulo="Actualizar datos."
        subtitulo="Edita tu nombre, telefono y presentacion."
      />

      {camarero.isLoading && (
        <p className="text-ash text-sm">Cargando tus datos...</p>
      )}
      {camarero.isError && (
        <p className="text-wine text-sm">
          No se pudo cargar tu perfil: {(camarero.error as Error).message}
        </p>
      )}

      {camarero.data && (
        <Card className="p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-wider2 text-ash mb-6">
            email: <span className="text-ink">{camarero.data.email}</span>
            {" · "}
            estado: <span className="text-ink">{camarero.data.estadoCuenta.toLowerCase().replace(/_/g, " ")}</span>
          </p>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <Input
              label="Nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={errores.nombre}
            />
            <Input
              label="Telefono"
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              error={errores.telefono}
            />
            <Textarea
              label="Presentacion"
              rows={5}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              error={errores.bio}
              hint={`Entre ${BIO_MIN} y ${BIO_MAX} caracteres (${bio.trim().length} actuales)`}
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
                Datos actualizados.
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={mut.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function VistaGestor({ email }: { email: string }): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Mi cuenta"
        titulo="Actualizar datos."
        subtitulo="Edita los datos de tu cuenta."
      />
      <Card className="p-6 sm:p-8">
        <p className="eyebrow mb-3">Proximamente</p>
        <p className="text-ink text-[15px] leading-relaxed mb-3">
          La edicion de datos del gestor todavia no esta disponible en la app.
          Si necesitas cambiar algo, contacta con el equipo de soporte.
        </p>
        <p className="text-ash text-sm">
          Tu email actual: <span className="font-mono text-ink">{email}</span>
        </p>
      </Card>
    </div>
  );
}
