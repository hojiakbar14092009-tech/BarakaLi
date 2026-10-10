import { TASHKENT_UTC_OFFSET_HOURS } from './constants.js';

const HOUR_MS = 60 * 60 * 1000;
const OFFSET_MS = TASHKENT_UTC_OFFSET_HOURS * HOUR_MS;

export interface TimeRange {
  start: Date;
  end: Date;
}

/** `2026-03-04` + `10:30` in Asia/Tashkent (fixed UTC+5, no DST) as a UTC instant. */
export function tashkentToDate(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+0${TASHKENT_UTC_OFFSET_HOURS}:00`);
}

/** Calendar day of an instant in Asia/Tashkent as `YYYY-MM-DD`. */
export function tashkentDay(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Wall-clock `HH:MM` of an instant in Asia/Tashkent. */
export function tashkentTime(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function rangeContains(outer: TimeRange, inner: TimeRange): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/**
 * Start times (one per hour from the window start) at which a booking of `hours` hours fits
 * inside the window, does not touch a booked range and does not start in the past.
 */
export function bookableStarts(
  window: TimeRange,
  booked: TimeRange[],
  hours: number,
  now: Date,
): Date[] {
  const starts: Date[] = [];
  const length = hours * HOUR_MS;
  for (let t = window.start.getTime(); t + length <= window.end.getTime(); t += HOUR_MS) {
    const candidate = { start: new Date(t), end: new Date(t + length) };
    if (candidate.start <= now) continue;
    if (booked.some((range) => rangesOverlap(range, candidate))) continue;
    starts.push(candidate.start);
  }
  return starts;
}
