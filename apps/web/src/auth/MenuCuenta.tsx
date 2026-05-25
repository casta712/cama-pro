import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { UsuarioDTO } from "@cama-pro/shared-types";

interface Props {
  usuario: UsuarioDTO;
  onCerrarSesion: () => void;
}

interface ItemDef {
  href: string;
  label: string;
  variante?: "danger";
}

const ITEMS: ReadonlyArray<ItemDef> = [
  { href: "/cuenta/datos", label: "Actualizar datos" },
  { href: "/cuenta", label: "Cambiar contrasena" },
  { href: "/cuenta/eliminar", label: "Eliminar cuenta", variante: "danger" },
];

export function MenuCuenta({ usuario, onCerrarSesion }: Props): JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Cierra al navegar entre items
  useEffect(() => {
    setAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  const cerrarSesion = (): void => {
    setAbierto(false);
    onCerrarSesion();
    navigate("/login", { replace: true });
  };

  const iniciales =
    usuario.email
      .split("@")[0]
      ?.slice(0, 2)
      .toUpperCase() ?? "??";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Abrir menu de cuenta"
        onClick={() => setAbierto((v) => !v)}
        className={[
          "inline-flex items-center gap-2 h-9 px-2 rounded-card transition-colors",
          "border border-line bg-bone hover:border-ink/40",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra",
          abierto ? "border-ink/40" : "",
        ].join(" ")}
      >
        <span className="hidden md:inline text-xs font-mono uppercase tracking-wider2 text-ash">
          {usuario.rol.toLowerCase()}
        </span>
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-ink text-bone font-mono text-[10px] uppercase">
          {iniciales}
        </span>
        <IconoHamburguesa abierto={abierto} />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Menu de cuenta"
          className="absolute right-0 top-full mt-2 w-64 bg-bone border border-line rounded-card shadow-soft z-50 animate-fadeIn overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="font-mono text-[10px] uppercase tracking-wider2 text-ash">
              {usuario.rol.toLowerCase()}
            </p>
            <p className="text-sm text-ink truncate">{usuario.email}</p>
          </div>

          <nav className="py-1">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                role="menuitem"
                className={[
                  "block px-4 py-2 text-sm transition-colors",
                  item.variante === "danger"
                    ? "text-wine hover:bg-wine/5"
                    : "text-ink hover:bg-cream/60 hover:text-terra",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-line">
            <button
              type="button"
              role="menuitem"
              onClick={cerrarSesion}
              className="w-full text-left px-4 py-2 text-sm font-mono uppercase tracking-wider2 text-ash hover:bg-cream/60 hover:text-terra transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconoHamburguesa({ abierto }: { abierto: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
      className={["text-ash transition-transform", abierto ? "rotate-90" : ""].join(" ")}
    >
      <path
        d="M2 4h12M2 8h12M2 12h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
