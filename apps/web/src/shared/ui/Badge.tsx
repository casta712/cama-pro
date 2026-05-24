import type { ReactNode } from "react";

type Tono = "neutro" | "verde" | "ambar" | "terra" | "wine";

interface Props {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}

const TONOS: Record<Tono, string> = {
  neutro: "bg-cream text-ink border-line",
  verde: "bg-sage/15 text-sage border-sage/30",
  ambar: "bg-terra/10 text-terra-deep border-terra/40",
  terra: "bg-terra text-bone border-terra",
  wine: "bg-wine/10 text-wine border-wine/30",
};

export function Badge({ tono = "neutro", children, className }: Props): JSX.Element {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5",
        "text-[10px] font-mono uppercase tracking-wider2",
        "border rounded-card",
        TONOS[tono],
        className ?? "",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
