import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { MenuCuenta } from "../auth/MenuCuenta.js";
import { AvisosCampana } from "../shared/avisos/AvisosCampana.js";

interface EnlaceNav {
  href: string;
  label: string;
}

const enlacesGestor: ReadonlyArray<EnlaceNav> = [
  { href: "/", label: "Inicio" },
  { href: "/gestor/servicios", label: "Servicios" },
  { href: "/gestor/camareros", label: "Camareros" },
];

const enlacesCamarero: ReadonlyArray<EnlaceNav> = [
  { href: "/disponibles", label: "Disponibles" },
  { href: "/mis-asignaciones", label: "Mis asignaciones" },
];

export function AppLayout(): JSX.Element {
  const { usuario, cerrarSesion } = useAuth();

  const enlaces =
    usuario?.rol === "GESTOR"
      ? enlacesGestor
      : usuario?.rol === "CAMARERO"
        ? enlacesCamarero
        : [];

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-line bg-bone/80 backdrop-blur supports-[backdrop-filter]:bg-bone/60 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-xl tracking-editorial">Cama-Pro</span>
            <span className="hidden sm:block h-px w-6 bg-ink/40 group-hover:bg-terra transition-colors" />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {enlaces.map((e) => (
              <NavLink
                key={e.href}
                to={e.href}
                end={e.href === "/"}
                className={({ isActive }) =>
                  [
                    "px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "text-ink underline decoration-terra decoration-2 underline-offset-[6px]"
                      : "text-ash hover:text-ink",
                  ].join(" ")
                }
              >
                {e.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {usuario && <AvisosCampana />}
            {usuario && (
              <MenuCuenta usuario={usuario} onCerrarSesion={cerrarSesion} />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line py-6 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-ash">
          <span className="font-mono uppercase tracking-wider2">Cama-Pro · 2026</span>
          <span className="italic font-display">camareros para tu noche</span>
        </div>
      </footer>
    </div>
  );
}
