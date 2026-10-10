import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const CONTROL =
  'min-h-12 w-full rounded-field border border-wheat bg-white/70 px-4 text-base text-espresso placeholder:text-mocha/70 disabled:opacity-60';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, hint, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-medium text-espresso">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-sm text-mocha">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-espresso">
          {error}
        </p>
      )}
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${CONTROL} ${error ? 'border-espresso' : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, className = '', id, ...rest }, ref) {
    const generated = useId();
    const areaId = id ?? generated;
    return (
      <FieldShell label={label} hint={hint} error={error} htmlFor={areaId}>
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={error ? true : undefined}
          className={`${CONTROL} py-3 ${error ? 'border-espresso' : ''} ${className}`}
          {...rest}
        />
      </FieldShell>
    );
  },
);

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  /** Keeps the label for screen readers only (as `aria-label`), e.g. a sort control. */
  hideLabel?: boolean;
}

/** Native select with the same 48 px box as text fields and a drawn chevron. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, options, hideLabel = false, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  const control = (
    <div className="relative">
      <select
        ref={ref}
        id={selectId}
        aria-label={hideLabel ? label : undefined}
        aria-invalid={error ? true : undefined}
        className={`${CONTROL} h-12 cursor-pointer appearance-none pr-11 ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-mocha"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  );
  if (hideLabel) return control;
  return (
    <FieldShell label={label} error={error} htmlFor={selectId}>
      {control}
    </FieldShell>
  );
});
