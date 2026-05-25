import { useAuth } from "./AuthContext.js";
import { Card } from "../shared/ui/Card.js";
import { PageHeader } from "../shared/ui/PageHeader.js";

export function EditarDatosPage(): JSX.Element {
  const { usuario } = useAuth();
  const esCamarero = usuario?.rol === "CAMARERO";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Mi cuenta"
        titulo="Actualizar datos."
        subtitulo={
          esCamarero
            ? "Edita tu nombre, telefono y presentacion."
            : "Edita los datos de tu cuenta."
        }
      />

      <Card className="p-6 sm:p-8">
        <p className="eyebrow mb-3">Proximamente</p>
        <p className="text-ink text-[15px] leading-relaxed mb-3">
          La edicion de datos del perfil todavia no esta disponible. Mientras
          tanto, si necesitas cambiar algun dato {esCamarero ? "(nombre, telefono o presentacion)" : ""} habla
          con el gestor del grupo.
        </p>
        <p className="text-ash text-sm">
          Tu email actual: <span className="font-mono text-ink">{usuario?.email}</span>
        </p>
      </Card>
    </div>
  );
}
