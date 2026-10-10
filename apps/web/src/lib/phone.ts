import { PHONE_COUNTRY_PREFIX } from '@barakali/shared';

export const PHONE_LOCAL_DIGITS = 9;
const COUNTRY_CODE = PHONE_COUNTRY_PREFIX.slice(1);
const PASTED_FULL_LENGTH = COUNTRY_CODE.length + PHONE_LOCAL_DIGITS;

/** Keeps only the 9 local digits; a pasted +998… number loses its country code. */
export function toLocalDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local =
    digits.length >= PASTED_FULL_LENGTH && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits;
  return local.slice(0, PHONE_LOCAL_DIGITS);
}

/** 901234567 -> "90 123 45 67" (groups of 2-3-2-2, filled as the user types). */
export function formatLocalDigits(digits: string): string {
  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return groups.filter(Boolean).join(' ');
}

/** +998901234567 -> "+998 90 123 45 67"; anything unexpected is shown as it came. */
export function formatPhoneDisplay(phone: string): string {
  const digits = toLocalDigits(phone);
  if (digits.length !== PHONE_LOCAL_DIGITS) return phone;
  return `${PHONE_COUNTRY_PREFIX} ${formatLocalDigits(digits)}`;
}

/** Caret index in the formatted text after `digitsBefore` digits. */
export function caretAfterDigits(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted.charAt(index))) seen += 1;
    if (seen === digitsBefore) return index + 1;
  }
  return formatted.length;
}
