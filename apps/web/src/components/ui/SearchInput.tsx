import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface SearchInputProps {
  id: string;
  /** Read by screen readers; the field shows only its placeholder. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A 48 px search field whose magnifier sits inside it, vertically centred on the input itself (not
 * on a taller parent), so nothing moves while typing or when results appear below.
 */
export function SearchInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative h-12 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mocha"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className="h-12 w-full rounded-field border border-wheat bg-white/70 pl-12 pr-4 text-base text-espresso placeholder:text-mocha/80"
      />
    </div>
  );
}
