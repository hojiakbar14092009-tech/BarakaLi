import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-field font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 select-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-mocha text-sugar hover:bg-espresso',
  secondary: 'bg-bisque text-espresso hover:bg-wheat/60',
  ghost: 'bg-transparent text-mocha hover:bg-bisque/60',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest} />
  );
});
