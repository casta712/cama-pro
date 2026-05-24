import type { ButtonHTMLAttributes } from "react";

type Variante = "solid" | "ghost" | "outline" | "danger";
type Tamano = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  loading?: boolean;
}

const VARIANTES: Record<Variante, string> = {
  solid:
    "bg-ink text-bone hover:bg-terra disabled:bg-ash disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-ink hover:text-terra disabled:text-ash disabled:cursor-not-allowed",
  outline:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-bone disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "bg-wine text-bone hover:bg-wine/85 disabled:bg-ash disabled:cursor-not-allowed",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[15px]",
};

export function Button({
  variante = "solid",
  tamano = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: Props): JSX.Element {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-card font-medium",
        "transition-all duration-200 ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra",
        VARIANTES[variante],
        TAMANOS[tamano],
        className ?? "",
      ].join(" ")}
    >
      {loading && (
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 border-2 border-current border-r-transparent rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
}
