import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { RolUsuario } from "@cama-pro/shared-types";
import { useAuth } from "../auth/AuthContext.js";

interface Props {
  rol?: RolUsuario;
  children: ReactNode;
}

export function ProtectedRoute({ rol, children }: Props): JSX.Element {
  const { estado, usuario } = useAuth();
  const location = useLocation();

  if (estado === "cargando") {
    return (
      <div className="min-h-full grid place-items-center text-ash text-sm">
        <span className="font-mono uppercase tracking-wider2">cargando sesion</span>
      </div>
    );
  }

  if (estado !== "autenticado" || !usuario) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (rol && usuario.rol !== rol) {
    const destino = usuario.rol === "GESTOR" ? "/gestor/servicios" : "/disponibles";
    return <Navigate to={destino} replace />;
  }

  return <>{children}</>;
}
