interface Props {
  ocupados: number;
  totales: number;
}

export function CupoBar({ ocupados, totales }: Props): JSX.Element {
  const pct = totales === 0 ? 0 : (ocupados / totales) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-mono uppercase tracking-wider2 text-ash">cupos</span>
        <span className="text-sm font-mono text-ink">
          {ocupados}
          <span className="text-ash">/{totales}</span>
        </span>
      </div>
      <div className="h-1 bg-line rounded-card overflow-hidden">
        <div
          className="h-full bg-terra transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={ocupados}
          aria-valuemin={0}
          aria-valuemax={totales}
        />
      </div>
    </div>
  );
}
