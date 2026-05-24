import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LoginInput } from "@cama-pro/shared-types";
import { Button } from "../shared/ui/Button.js";
import { Input } from "../shared/ui/Input.js";
import { ApiError } from "../shared/fetchClient.js";
import { useAuth } from "./AuthContext.js";

interface LocationState {
  from?: string;
}

export function LoginPage(): JSX.Element {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<{ email?: string; password?: string; global?: string }>({});
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrores({});

    const parsed = LoginInput.safeParse({ email, password });
    if (!parsed.success) {
      const errs: typeof errores = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") errs.email = "Email no valido";
        if (issue.path[0] === "password") errs.password = "Contrasena requerida";
      }
      setErrores(errs);
      return;
    }

    setEnviando(true);
    try {
      const usuario = await iniciarSesion(parsed.data.email, parsed.data.password);
      const destino =
        (location.state as LocationState | null)?.from ??
        (usuario.rol === "GESTOR" ? "/gestor/servicios" : "/disponibles");
      navigate(destino, { replace: true });
    } catch (err) {
      const mensaje =
        err instanceof ApiError && err.status === 401
          ? "Credenciales incorrectas"
          : err instanceof Error
            ? err.message
            : "No se pudo iniciar sesion";
      setErrores({ global: mensaje });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-full grid lg:grid-cols-5">
      {/* Panel editorial */}
      <aside className="hidden lg:flex lg:col-span-2 bg-ink text-bone p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, #FAF7F2 1px, transparent 1px), radial-gradient(circle at 80% 60%, #FAF7F2 1px, transparent 1px)",
            backgroundSize: "32px 32px, 48px 48px",
          }}
        />
        <div className="relative">
          <p className="font-mono uppercase tracking-wider2 text-bone/50 text-[11px]">Cama-Pro</p>
          <div className="h-px w-10 bg-terra mt-3" />
        </div>
        <div className="relative">
          <p className="font-display text-5xl leading-[1.05] tracking-editorial mb-6">
            Camareros<br />
            <span className="italic text-terra">para tu noche.</span>
          </p>
          <p className="text-bone/70 max-w-sm text-[15px] leading-relaxed">
            Coordina tu equipo en una sola pantalla. Publica el servicio,
            los camareros aceptan, tu sigues con la operativa.
          </p>
        </div>
        <p className="relative text-[11px] font-mono uppercase tracking-wider2 text-bone/40">
          MVP &middot; 2026
        </p>
      </aside>

      {/* Formulario */}
      <section className="lg:col-span-3 flex items-center justify-center p-6 sm:p-12 animate-fadeIn">
        <div className="w-full max-w-sm">
          <Link to="/" className="font-display text-2xl tracking-editorial mb-12 inline-block lg:hidden">
            Cama-Pro
          </Link>

          <p className="eyebrow mb-4">Acceso</p>
          <h1 className="font-display text-4xl tracking-editorial mb-2">Bienvenido.</h1>
          <p className="text-ash text-[15px] mb-8">
            Entra para gestionar tus servicios o ver los disponibles.
          </p>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errores.email}
            />
            <Input
              label="Contrasena"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errores.password}
            />

            {errores.global && (
              <div
                role="alert"
                className="border border-wine/40 bg-wine/5 text-wine text-sm px-3 py-2 rounded-card"
              >
                {errores.global}
              </div>
            )}

            <Button type="submit" loading={enviando} className="w-full">
              Iniciar sesion
            </Button>
          </form>

          <p className="text-sm text-ash mt-8">
            Eres camarero y aun no tienes cuenta?{" "}
            <Link to="/registro" className="text-ink underline decoration-terra decoration-2 underline-offset-4 hover:text-terra">
              Registrate
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
