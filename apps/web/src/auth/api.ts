import type {
  CambiarPasswordInput,
  LoginInput,
  UsuarioDTO,
} from "@cama-pro/shared-types";
import { apiRequest } from "../shared/fetchClient.js";

export interface LoginResponse {
  token: string;
  usuario: UsuarioDTO;
}

export function loginRequest(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: input,
  });
}

export function meRequest(): Promise<UsuarioDTO> {
  return apiRequest<UsuarioDTO>("/api/auth/me");
}

export function cambiarPasswordRequest(input: CambiarPasswordInput): Promise<void> {
  return apiRequest<void>("/api/auth/password", {
    method: "PATCH",
    body: input,
  });
}
