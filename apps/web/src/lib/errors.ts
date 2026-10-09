import type { TFunction } from 'i18next';
import { ApiError } from './api';

/** Turns any thrown value into a translated, human-readable message. */
export function errorMessage(error: unknown, t: TFunction): string {
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  return t(`errors.${code}`, { defaultValue: t('errors.INTERNAL_ERROR') });
}

/** Translates a validation message code coming from the shared zod schemas or the API. */
export function validationMessage(code: string | undefined, t: TFunction): string | undefined {
  if (!code) return undefined;
  return t(`validation.${code}`, { defaultValue: t('validation.invalid') });
}
