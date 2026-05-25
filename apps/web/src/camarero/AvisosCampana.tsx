import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { contarMisAvisosNoLeidos } from "./avisosApi.js";

/**
 * Boton-icono que vive en el header del camarero. Muestra un badge con el
 * numero de avisos no leidos. Polling suave cada 60s y refresca al volver
 * la pestaña al foco para evitar que el camarero se quede con un contador
 * obsoleto tras una accion del gestor.
 */
export function AvisosCampana(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["camarero", "avisos", "count"],
    queryFn: contarMisAvisosNoLeidos,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const total = data?.total ?? 0;
  const visible = total > 0;
  const etiqueta = visible
    ? `Avisos (${total} sin leer)`
    : "Avisos";

  return (
    <Link
      to="/avisos"
      aria-label={etiqueta}
      className={[
        "relative inline-flex items-center justify-center h-9 w-9 rounded-card",
        "border border-line bg-bone hover:border-ink/40 transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra",
      ].join(" ")}
    >
      <IconoCampana hayAvisos={visible} />
      {visible && (
        <span
          aria-hidden
          className={[
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
            "inline-flex items-center justify-center",
            "rounded-full bg-terra text-bone",
            "font-mono text-[10px] leading-none tabular-nums",
          ].join(" ")}
        >
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}

function IconoCampana({ hayAvisos }: { hayAvisos: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className={hayAvisos ? "text-ink" : "text-ash"}
    >
      <path
        d="M8 1.5c-.6 0-1 .4-1 1v.6C5.3 3.5 4 5 4 6.8V9l-1.2 1.6c-.3.3-.1.9.4.9h9.6c.5 0 .7-.6.4-.9L12 9V6.8C12 5 10.7 3.5 9 3.1V2.5c0-.6-.4-1-1-1zM6.5 12.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5z"
        fill="currentColor"
      />
    </svg>
  );
}
