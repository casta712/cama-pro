import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { RegistrarCamareroInput } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { Input } from "../shared/ui/Input.js";
import { Textarea } from "../shared/ui/Textarea.js";
import { ApiError, apiRequest } from "../shared/fetchClient.js";

type CampoError = "nombre" | "email" | "telefono" | "password" | "bio" | "global";
type Errores = Partial<Record<CampoError, string>>;

interface Formulario {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
  bio: string;
}

const INICIAL: Formulario = {
  nombre: "",
  email: "",
  telefono: "",
  password: "",
  bio: "",
};

const BIO_MIN = 30;
const BIO_MAX = 1000;

export function RegistroCamareroPage(): JSX.Element {
  const [valores, setValores] = useState<Formulario>(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  const cambiar = (campo: keyof Formulario) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    setValores((v) => ({ ...v, [campo]: e.target.value }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrores({});

    const parsed = RegistrarCamareroInput.safeParse(valores);
    if (!parsed.success) {
      const errs: Errores = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as CampoError;
        if (campo === "nombre") errs.nombre = "Nombre entre 2 y 80 caracteres";
        if (campo === "email") errs.email = "Email no valido";
        if (campo === "telefono") errs.telefono = "Telefono entre 6 y 20 caracteres";
        if (campo === "password") errs.password = "Minimo 8 caracteres";
        if (campo === "bio")
          errs.bio = `Cuentanos un poco mas (entre ${BIO_MIN} y ${BIO_MAX} caracteres)`;
      }
      setErrores(errs);
      return;
    }

    setEnviando(true);
    try {
      await apiRequest("/api/camareros/registro", { method: "POST", body: parsed.data });
      setExito(true);
    } catch (err) {
      const mensaje =
        err instanceof ApiError && err.status === 409
          ? "Ese email ya esta registrado"
          : err instanceof Error
            ? err.message
            : "No se pudo completar el registro";
      setErrores({ global: mensaje });
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="min-h-full grid place-items-center p-6 animate-fadeIn">
        <div className="max-w-md w-full text-center">
          <p className="eyebrow mb-4">Recibido</p>
          <h1 className="font-display text-4xl tracking-editorial mb-3">
            Estas <span className="italic text-terra">en la lista</span>.
          </h1>
          <p className="text-ash text-[15px] mb-8 leading-relaxed">
            Tu solicitud ha sido enviada. Un gestor la revisara y te notificara
            cuando puedas empezar a aceptar servicios.
          </p>
          <Link
            to="/login"
            className="text-sm font-mono uppercase tracking-wider2 text-ink hover:text-terra"
          >
            volver a inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6 sm:p-12 animate-fadeIn">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl tracking-editorial mb-10 inline-block">
          Cama-Pro
        </Link>

        <p className="eyebrow mb-4">Camareros</p>
        <h1 className="font-display text-4xl tracking-editorial mb-2">Unete al equipo.</h1>
        <p className="text-ash text-[15px] mb-8">
          Completa tus datos. Un gestor aprobara tu cuenta antes de que puedas
          aceptar servicios.
        </p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Nombre completo"
            autoComplete="name"
            value={valores.nombre}
            onChange={cambiar("nombre")}
            error={errores.nombre}
            required
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={valores.email}
            onChange={cambiar("email")}
            error={errores.email}
            required
          />
          <Input
            label="Telefono"
            type="tel"
            autoComplete="tel"
            value={valores.telefono}
            onChange={cambiar("telefono")}
            error={errores.telefono}
            required
          />
          <Input
            label="Contrasena"
            type="password"
            autoComplete="new-password"
            value={valores.password}
            onChange={cambiar("password")}
            error={errores.password}
            hint="Minimo 8 caracteres"
            required
          />

          <div>
            <Textarea
              label="Presentacion"
              placeholder="Anos de experiencia, tipos de evento que has cubierto, idiomas, habilidades especiales..."
              rows={5}
              value={valores.bio}
              maxLength={BIO_MAX}
              onChange={cambiar("bio")}
              error={errores.bio}
              hint={`Entre ${BIO_MIN} y ${BIO_MAX} caracteres. El gestor leera esto para decidir si te aprueba.`}
              required
            />
            <div className="mt-1 flex justify-end">
              <span
                className={[
                  "text-[11px] font-mono uppercase tracking-wider2",
                  valores.bio.trim().length < BIO_MIN ? "text-ash" : "text-sage",
                ].join(" ")}
              >
                {valores.bio.trim().length}/{BIO_MAX}
              </span>
            </div>
          </div>

          {errores.global && (
            <div
              role="alert"
              className="border border-wine/40 bg-wine/5 text-wine text-sm px-3 py-2 rounded-card"
            >
              {errores.global}
            </div>
          )}

          <Button type="submit" loading={enviando} className="w-full">
            Solicitar acceso
          </Button>
        </form>

        <p className="text-sm text-ash mt-8">
          Ya tienes cuenta?{" "}
          <Link to="/login" className="text-ink underline decoration-terra decoration-2 underline-offset-4 hover:text-terra">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
