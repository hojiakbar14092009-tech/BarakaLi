import { z } from 'zod';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, TASHKENT_UTC_OFFSET_HOURS } from '../constants.js';
import { phoneSchema } from '../schemas.js';
import { CATERING_SERVICE_IDS } from './service-types.js';

export const CATERING_MIN_GUESTS = 1;
export const CATERING_MAX_GUESTS = 5000;
export const CATERING_MAX_NOTE_LENGTH = 1000;

const HOUR_MS = 3_600_000;

/** Today's calendar date in Asia/Tashkent (fixed UTC+5), as YYYY-MM-DD. */
export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + TASHKENT_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

/** True when `date` (YYYY-MM-DD) is a real calendar day strictly after today in Tashkent. */
export function isFutureEventDate(date: string, now: Date = new Date()): boolean {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  return date > tashkentToday(now);
}

export const cateringRequestSchema = z.object({
  name: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH),
  phone: phoneSchema,
  serviceTypeId: z.enum(CATERING_SERVICE_IDS),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'INVALID_DATE')
    .refine((value) => isFutureEventDate(value), 'DATE_NOT_IN_FUTURE'),
  guestsCount: z.number().int().min(CATERING_MIN_GUESTS).max(CATERING_MAX_GUESTS),
  note: z.string().trim().max(CATERING_MAX_NOTE_LENGTH).default(''),
});
export type CateringRequestInput = z.infer<typeof cateringRequestSchema>;
export type CateringRequestRaw = z.input<typeof cateringRequestSchema>;
