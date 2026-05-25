import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { CuentaPage } from "../auth/CuentaPage.js";
import { EditarDatosPage } from "../auth/EditarDatosPage.js";
import { EliminarCuentaPage } from "../auth/EliminarCuentaPage.js";
import { LoginPage } from "../auth/LoginPage.js";
import { RegistroCamareroPage } from "../auth/RegistroCamareroPage.js";
import { ServiciosGestorPage } from "../gestor/ServiciosGestorPage.js";
import { CrearServicioPage } from "../gestor/CrearServicioPage.js";
import { EditarServicioPage } from "../gestor/EditarServicioPage.js";
import { CamarerosGestorPage } from "../gestor/CamarerosGestorPage.js";
import { DashboardGestorPage } from "../gestor/DashboardGestorPage.js";
import { ServiciosDisponiblesPage } from "../camarero/ServiciosDisponiblesPage.js";
import { MisAsignacionesPage } from "../camarero/MisAsignacionesPage.js";
import { AvisosPage } from "../camarero/AvisosPage.js";
import { DetalleServicioPage } from "../shared/DetalleServicioPage.js";
import { AppLayout } from "./AppLayout.js";
import { ProtectedRoute } from "./ProtectedRoute.js";

function Inicio(): JSX.Element {
  const { estado, usuario } = useAuth();
  if (estado === "cargando") {
    return (
      <div className="min-h-full grid place-items-center text-ash text-sm">
        <span className="font-mono uppercase tracking-wider2">cargando</span>
      </div>
    );
  }
  if (estado !== "autenticado" || !usuario) {
    return <Navigate to="/login" replace />;
  }
  if (usuario.rol === "GESTOR") {
    return <DashboardGestorPage />;
  }
  return <Navigate to="/disponibles" replace />;
}

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroCamareroPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Inicio />} />

        <Route
          path="/gestor/servicios"
          element={
            <ProtectedRoute rol="GESTOR">
              <ServiciosGestorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestor/servicios/nuevo"
          element={
            <ProtectedRoute rol="GESTOR">
              <CrearServicioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestor/servicios/:id/editar"
          element={
            <ProtectedRoute rol="GESTOR">
              <EditarServicioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestor/camareros"
          element={
            <ProtectedRoute rol="GESTOR">
              <CamarerosGestorPage />
            </ProtectedRoute>
          }
        />

        <Route path="/servicios/:id" element={<DetalleServicioPage />} />
        <Route path="/cuenta" element={<CuentaPage />} />
        <Route path="/cuenta/datos" element={<EditarDatosPage />} />
        <Route path="/cuenta/eliminar" element={<EliminarCuentaPage />} />

        <Route
          path="/disponibles"
          element={
            <ProtectedRoute rol="CAMARERO">
              <ServiciosDisponiblesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-asignaciones"
          element={
            <ProtectedRoute rol="CAMARERO">
              <MisAsignacionesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/avisos"
          element={
            <ProtectedRoute rol="CAMARERO">
              <AvisosPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
