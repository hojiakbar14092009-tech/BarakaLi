import { PHONE_COUNTRY_PREFIX } from '@barakali/shared';
import { forwardRef, useId, useLayoutEffect, useRef, type ChangeEvent, type Ref } from 'react';
import { caretAfterDigits, formatLocalDigits, toLocalDigits } from '../../lib/phone';

interface PhoneInputProps {
  label: string;
  /** The 9 local digits, without the +998 prefix. */
  value: string;
  onChange: (digits: string) => void;
  onBlur?: () => void;
  name?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

function useCombinedRef<T>(forwarded: Ref<T>, local: { current: T | null }) {
  return (node: T | null) => {
    local.current = node;
    if (typeof forwarded === 'function') forwarded(node);
    else if (forwarded) (forwarded as { current: T | null }).current = node;
  };
}

/**
 * One bordered control: the "+998" prefix and the number share a single 48 px box, with the label
 * above, flush with its left edge. The value is held as 9 digits and shown as "90 123 45 67".
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { label, value, onChange, onBlur, name, hint, error, disabled, autoFocus },
  forwarded,
) {
  const id = useId();
  const prefixId = `${id}-prefix`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caret = useRef<number | null>(null);
  const setRefs = useCombinedRef(forwarded, inputRef);
  const formatted = formatLocalDigits(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && caret.current !== null && document.activeElement === input) {
      input.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  }, [formatted]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const digits = toLocalDigits(raw);
    const digitsBeforeCaret = toLocalDigits(
      raw.slice(0, event.target.selectionStart ?? raw.length),
    ).length;
    caret.current = caretAfterDigits(formatLocalDigits(digits), digitsBeforeCaret);
    onChange(digits);
  };

  const describedBy =
    [prefixId, error ? `${id}-error` : hint ? `${id}-hint` : undefined].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium text-espresso">
        {label}
      </label>
      <div
        data-phone-field=""
        // The 1 px frame is an inset outline, so the box and the input are exactly 48 px tall.
        className={`flex h-12 w-full overflow-hidden rounded-field bg-white/70 outline outline-1 -outline-offset-1 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-mocha ${
          error ? 'outline-espresso' : 'outline-wheat'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span
          id={prefixId}
          className="flex shrink-0 items-center border-r border-wheat bg-bisque px-4 font-semibold text-espresso"
        >
          {PHONE_COUNTRY_PREFIX}
        </span>
        <input
          ref={setRefs}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="90 123 45 67"
          value={formatted}
          onChange={handleChange}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base text-espresso outline-none placeholder:text-mocha/70"
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-mocha">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-espresso">
          {error}
        </p>
      )}
    </div>
  );
});
