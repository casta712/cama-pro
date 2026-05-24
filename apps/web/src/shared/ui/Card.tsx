import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactivo?: boolean;
  children: ReactNode;
}

export function Card({ interactivo, className, children, ...rest }: Props): JSX.Element {
  return (
    <div
      {...rest}
      className={[
        "bg-cream/60 border border-line rounded-card",
        "transition-colors duration-200",
        interactivo ? "hover:border-ink/40 hover:bg-cream" : "",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
