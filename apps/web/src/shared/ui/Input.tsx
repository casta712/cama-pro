import { forwardRef, type InputHTMLAttributes, useId } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={[
          "block w-full h-11 px-3 bg-bone text-ink",
          "border border-line rounded-card",
          "placeholder:text-ash/70",
          "focus:outline-none focus:border-ink focus:ring-2 focus:ring-terra/30",
          error ? "border-wine focus:border-wine focus:ring-wine/20" : "",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ash">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-wine">
          {error}
        </p>
      )}
    </div>
  );
});
