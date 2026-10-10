import { tashkentDay, tashkentTime } from '@barakali/shared';

const TIME_ZONE = 'Asia/Tashkent';

function locale(language: string): string {
  return language === 'ru' ? 'ru-RU' : 'uz-UZ';
}

/** `2026-03-04` → "4 mart, chorshanba" in the UI language, interpreted as a Tashkent calendar day. */
export function formatDay(day: string, language: string): string {
  const instant = new Date(`${day}T12:00:00+05:00`);
  return instant.toLocaleDateString(locale(language), {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
}

export function formatDateTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(locale(language), {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "10:00–14:00" in Asia/Tashkent. */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${tashkentTime(new Date(startIso))}–${tashkentTime(new Date(endIso))}`;
}

export function dayOf(iso: string): string {
  return tashkentDay(new Date(iso));
}
