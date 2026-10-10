import { afterEach, describe, expect, it, vi } from 'vitest';
import { cateringRequestSchema, isFutureEventDate, tashkentToday } from './request.js';
import {
  CATERING_OTHER_SERVICE_ID,
  CATERING_SERVICE_IDS,
  CATERING_SERVICE_TYPES,
} from './service-types.js';

const IMAGE_FILES = ['tikuvchilik.jpg', 'pishiriq.jpg', 'qolmehnat.jpg', 'dizayn.jpg'];

describe('catering service types', () => {
  it('has exactly the four types in order', () => {
    expect(CATERING_SERVICE_TYPES.map((type) => type.id)).toEqual([
      'tikuvchilik',
      'pishiriq',
      'qolmehnat',
      'dizayn',
    ]);
  });

  it('gives every type a uz and ru title and description', () => {
    for (const type of CATERING_SERVICE_TYPES) {
      for (const text of [type.title_uz, type.title_ru, type.description_uz, type.description_ru]) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
      expect(type.title_ru).toMatch(/[А-Яа-яЁё]/);
      expect(type.description_ru).toMatch(/[А-Яа-яЁё]/);
    }
  });

  it('matches every imageKey to one of the expected image file names', () => {
    expect(CATERING_SERVICE_TYPES.map((type) => `${type.imageKey}.jpg`)).toEqual(IMAGE_FILES);
  });

  it('never mentions a price', () => {
    const text = CATERING_SERVICE_TYPES.map(
      (t) => `${t.description_uz} ${t.description_ru}`,
    ).join();
    expect(text).not.toMatch(/soʻm|so'm|сум|\d/);
  });

  it('lets the form pick any type or "other"', () => {
    expect([...CATERING_SERVICE_IDS]).toEqual([
      ...CATERING_SERVICE_TYPES.map((type) => type.id),
      CATERING_OTHER_SERVICE_ID,
    ]);
  });
});

describe('event date', () => {
  // 2026-10-10 20:00 UTC is already 2026-10-11 in Tashkent.
  const lateEvening = new Date('2026-10-10T20:00:00Z');

  it('uses the Tashkent calendar day', () => {
    expect(tashkentToday(lateEvening)).toBe('2026-10-11');
  });

  it('accepts only real days after today', () => {
    expect(isFutureEventDate('2026-10-12', lateEvening)).toBe(true);
    expect(isFutureEventDate('2026-10-11', lateEvening)).toBe(false);
    expect(isFutureEventDate('2026-10-01', lateEvening)).toBe(false);
    expect(isFutureEventDate('2026-02-30', lateEvening)).toBe(false);
  });
});

describe('cateringRequestSchema', () => {
  afterEach(() => vi.useRealTimers());

  const valid = {
    name: 'Malika',
    phone: '90 123 45 67',
    serviceTypeId: 'pishiriq',
    eventDate: '2026-11-01',
    guestsCount: 40,
  };

  const parse = (input: Record<string, unknown>) => {
    vi.useFakeTimers({ now: new Date('2026-10-10T08:00:00Z') });
    return cateringRequestSchema.safeParse(input);
  };

  it('accepts a full request and normalises the phone to +998', () => {
    const result = parse({ ...valid, note: '  Choy uchun  ' });
    expect(result.success && result.data).toMatchObject({
      phone: '+998901234567',
      note: 'Choy uchun',
    });
  });

  it('rejects a phone that is not an Uzbek number', () => {
    expect(parse({ ...valid, phone: '12345' }).success).toBe(false);
  });

  it('rejects zero guests', () => {
    expect(parse({ ...valid, guestsCount: 0 }).success).toBe(false);
  });

  it('rejects a date that is not in the future', () => {
    expect(parse({ ...valid, eventDate: '2026-10-10' }).success).toBe(false);
  });

  it('rejects an unknown service type', () => {
    expect(parse({ ...valid, serviceTypeId: 'masofaviy-ishlar' }).success).toBe(false);
  });
});
