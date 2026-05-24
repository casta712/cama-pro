import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app/routes.js";
import { AuthProvider } from "./auth/AuthContext.js";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
