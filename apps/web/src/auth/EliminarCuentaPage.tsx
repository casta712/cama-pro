import { Card } from "../shared/ui/Card.js";
import { PageHeader } from "../shared/ui/PageHeader.js";

export function EliminarCuentaPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <PageHeader
        eyebrow="Mi cuenta"
        titulo="Eliminar cuenta."
        subtitulo="Borra definitivamente tu acceso a Cama-Pro."
      />

      <Card className="p-6 sm:p-8 border-wine/30">
        <p className="eyebrow mb-3 text-wine">Proximamente</p>
        <p className="text-ink text-[15px] leading-relaxed mb-3">
          El borrado de cuenta todavia no esta disponible desde la app. Si
          quieres dejar de formar parte del grupo, contacta con el gestor y el
          retirara tu acceso.
        </p>
        <p className="text-ash text-sm">
          Cuando esta funcion este lista te avisaremos al iniciar sesion.
        </p>
      </Card>
    </div>
  );
}
