import type { ReactNode } from "react";

interface Props {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}

export function EmptyState({ titulo, descripcion, accion }: Props): JSX.Element {
  return (
    <div className="border border-dashed border-line rounded-card py-14 px-6 text-center">
      <p className="font-display text-2xl tracking-editorial text-ink mb-1">{titulo}</p>
      {descripcion && <p className="text-sm text-ash max-w-md mx-auto">{descripcion}</p>}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}
