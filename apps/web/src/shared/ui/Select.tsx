import { forwardRef, type SelectHTMLAttributes, useId } from "react";

interface Opcion {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  opciones: ReadonlyArray<Opcion>;
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, opciones, placeholder, error, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="w-full">
      <label htmlFor={selectId} className="field-label">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={[
          "block w-full h-11 px-3 bg-bone text-ink",
          "border border-line rounded-card appearance-none",
          "focus:outline-none focus:border-ink focus:ring-2 focus:ring-terra/30",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22none%22 stroke=%22%236B655C%22 stroke-width=%221.4%22 d=%22M1 1l4 4 4-4%22/></svg>')] bg-no-repeat",
          "bg-[length:10px_6px] bg-[right_14px_center] pr-9",
          error ? "border-wine focus:border-wine focus:ring-wine/20" : "",
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
    </div>
  );
});
