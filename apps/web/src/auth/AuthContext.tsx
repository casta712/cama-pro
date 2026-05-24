import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UsuarioDTO } from "@cama-pro/shared-types";
import {
  borrarToken,
  guardarToken,
  leerToken,
} from "../shared/fetchClient.js";
import { loginRequest, meRequest } from "./api.js";

type EstadoAuth =
  | { estado: "cargando"; usuario: null }
  | { estado: "anonimo"; usuario: null }
  | { estado: "autenticado"; usuario: UsuarioDTO };

interface AuthContextValue {
  estado: EstadoAuth["estado"];
  usuario: UsuarioDTO | null;
  iniciarSesion: (email: string, password: string) => Promise<UsuarioDTO>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [valor, setValor] = useState<EstadoAuth>(() => ({
    estado: leerToken() ? "cargando" : "anonimo",
    usuario: null,
  }));

  useEffect(() => {
    if (valor.estado !== "cargando") return;
    let activo = true;
    meRequest()
      .then((usuario) => {
        if (activo) setValor({ estado: "autenticado", usuario });
      })
      .catch(() => {
        borrarToken();
        if (activo) setValor({ estado: "anonimo", usuario: null });
      });
    return () => {
      activo = false;
    };
  }, [valor.estado]);

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<UsuarioDTO> => {
      const out = await loginRequest({ email, password });
      guardarToken(out.token);
      setValor({ estado: "autenticado", usuario: out.usuario });
      return out.usuario;
    },
    [],
  );

  const cerrarSesion = useCallback(() => {
    borrarToken();
    setValor({ estado: "anonimo", usuario: null });
  }, []);

  const ctx = useMemo<AuthContextValue>(
    () => ({
      estado: valor.estado,
      usuario: valor.usuario,
      iniciarSesion,
      cerrarSesion,
    }),
    [valor, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
