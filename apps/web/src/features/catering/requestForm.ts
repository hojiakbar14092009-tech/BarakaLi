import {
  CATERING_MAX_GUESTS,
  CATERING_MAX_NOTE_LENGTH,
  CATERING_MIN_GUESTS,
  CATERING_SERVICE_IDS,
  MAX_NAME_LENGTH,
  MIN_NAME_LENGTH,
  PHONE_COUNTRY_PREFIX,
  isFutureEventDate,
  tashkentToday,
  type CateringRequestRaw,
} from '@barakali/shared';
import { z } from 'zod';

/** Form-side rules mirror the shared request schema, with a message code per field for i18n. */
export const requestFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, 'NAME_TOO_SHORT')
    .max(MAX_NAME_LENGTH, 'NAME_TOO_LONG'),
  phone: z.string().regex(/^\d{9}$/, 'INVALID_PHONE'),
  serviceTypeId: z
    .union([z.enum(CATERING_SERVICE_IDS), z.literal('')])
    .refine((value) => value.length > 0, 'SERVICE_REQUIRED'),
  eventDate: z
    .string()
    .min(1, 'DATE_REQUIRED')
    .refine((value) => isFutureEventDate(value), 'DATE_NOT_IN_FUTURE'),
  guestsCount: z
    .number({ invalid_type_error: 'GUESTS_MIN' })
    .int('GUESTS_MIN')
    .min(CATERING_MIN_GUESTS, 'GUESTS_MIN')
    .max(CATERING_MAX_GUESTS, 'GUESTS_MAX'),
  note: z.string().trim().max(CATERING_MAX_NOTE_LENGTH, 'NOTE_TOO_LONG'),
});

export type RequestFormValues = z.infer<typeof requestFormSchema>;

export const EMPTY_REQUEST: RequestFormValues = {
  name: '',
  phone: '',
  serviceTypeId: '',
  eventDate: '',
  guestsCount: Number.NaN,
  note: '',
};

/** The earliest date the date picker offers: tomorrow in Tashkent. */
export function firstBookableDate(now: Date = new Date()): string {
  const today = new Date(`${tashkentToday(now)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() + 1);
  return today.toISOString().slice(0, 10);
}

/** Called after validation, so the service is never the empty placeholder here. */
export function toRequestPayload(values: RequestFormValues): CateringRequestRaw {
  return {
    name: values.name,
    phone: `${PHONE_COUNTRY_PREFIX}${values.phone}`,
    serviceTypeId: values.serviceTypeId as CateringRequestRaw['serviceTypeId'],
    eventDate: values.eventDate,
    guestsCount: values.guestsCount,
    note: values.note,
  };
}
