import { forwardRef, type TextareaHTMLAttributes, useId } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, error, className, id, rows = 3, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={[
          "block w-full px-3 py-2 bg-bone text-ink",
          "border border-line rounded-card",
          "placeholder:text-ash/70 resize-y",
          "focus:outline-none focus:border-ink focus:ring-2 focus:ring-terra/30",
          error ? "border-wine focus:border-wine focus:ring-wine/20" : "",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ash">{hint}</p>}
      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
    </div>
  );
});
