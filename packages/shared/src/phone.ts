import { PHONE_COUNTRY_PREFIX } from './constants.js';

const LOCAL_DIGITS = 9;
const COUNTRY_DIGITS = '998';

/** Returns +998XXXXXXXXX or null when the input is not a valid Uzbek mobile number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === LOCAL_DIGITS) return `${PHONE_COUNTRY_PREFIX}${digits}`;
  if (digits.length === COUNTRY_DIGITS.length + LOCAL_DIGITS && digits.startsWith(COUNTRY_DIGITS)) {
    return `+${digits}`;
  }
  return null;
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 7)}***${phone.slice(-2)}`;
}
