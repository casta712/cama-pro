import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}

export function PageHeader({ eyebrow, titulo, subtitulo, accion }: Props): JSX.Element {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 sm:mb-10 animate-riseIn">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-4xl sm:text-5xl tracking-editorial leading-[1.05]">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-ash mt-3 max-w-xl text-[15px] leading-relaxed">{subtitulo}</p>
        )}
        <div className="rule mt-5" />
      </div>
      {accion && <div className="shrink-0 hidden sm:block">{accion}</div>}
    </div>
  );
}
