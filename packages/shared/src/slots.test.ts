import { describe, expect, it } from 'vitest';
import {
  bookableStarts,
  createServiceOrderSchema,
  rangeContains,
  rangesOverlap,
  tashkentDay,
  tashkentTime,
  tashkentToDate,
} from './index.js';

const WORKER_ID = '6f1b4f0e-79a1-4a5b-8f0e-3f9d2f3f6a11';

describe('Tashkent time helpers', () => {
  it('converts wall time to UTC and back', () => {
    const start = tashkentToDate('2026-03-04', '10:00');
    expect(start.toISOString()).toBe('2026-03-04T05:00:00.000Z');
    expect(tashkentDay(start)).toBe('2026-03-04');
    expect(tashkentTime(start)).toBe('10:00');
  });

  it('rolls over to the next calendar day after 19:00 UTC', () => {
    expect(tashkentDay(new Date('2026-03-04T23:30:00Z'))).toBe('2026-03-05');
    expect(tashkentTime(new Date('2026-03-04T23:30:00Z'))).toBe('04:30');
  });
});

describe('range helpers', () => {
  const a = { start: new Date('2026-03-04T05:00:00Z'), end: new Date('2026-03-04T07:00:00Z') };

  it('treats touching ranges as non-overlapping', () => {
    const touching = {
      start: new Date('2026-03-04T07:00:00Z'),
      end: new Date('2026-03-04T08:00:00Z'),
    };
    expect(rangesOverlap(a, touching)).toBe(false);
    expect(rangesOverlap(a, { ...touching, start: new Date('2026-03-04T06:59:00Z') })).toBe(true);
  });

  it('checks containment including equal bounds', () => {
    expect(rangeContains(a, a)).toBe(true);
    expect(rangeContains(a, { start: a.start, end: new Date('2026-03-04T07:01:00Z') })).toBe(false);
  });
});

describe('bookableStarts', () => {
  const window = {
    start: tashkentToDate('2026-03-04', '10:00'),
    end: tashkentToDate('2026-03-04', '14:00'),
  };
  const booked = [
    { start: tashkentToDate('2026-03-04', '12:00'), end: tashkentToDate('2026-03-04', '13:00') },
  ];
  const long = new Date('2026-03-01T00:00:00Z');
  const times = (dates: Date[]) => dates.map(tashkentTime);

  it('skips hours that collide with a booking', () => {
    expect(times(bookableStarts(window, booked, 1, long))).toEqual(['10:00', '11:00', '13:00']);
  });

  it('requires the whole duration to fit', () => {
    expect(times(bookableStarts(window, booked, 2, long))).toEqual(['10:00']);
    expect(bookableStarts(window, [], 5, long)).toEqual([]);
  });

  it('never offers a start that has already begun', () => {
    const now = tashkentToDate('2026-03-04', '10:30');
    expect(times(bookableStarts(window, booked, 1, now))).toEqual(['11:00', '13:00']);
  });
});

describe('createServiceOrderSchema', () => {
  const base = {
    workerId: WORKER_ID,
    description: 'Koylak tikish',
    startTime: '2026-03-04T05:00:00.000Z',
    hours: 2,
  };

  it('defaults deadline and images', () => {
    const parsed = createServiceOrderSchema.parse(base);
    expect(parsed.deadline).toBeNull();
    expect(parsed.imageUrls).toEqual([]);
  });

  it('allows at most five reference images', () => {
    const urls = ['a', 'b', 'c', 'd', 'e'];
    expect(createServiceOrderSchema.safeParse({ ...base, imageUrls: urls }).success).toBe(true);
    expect(createServiceOrderSchema.safeParse({ ...base, imageUrls: [...urls, 'f'] }).success).toBe(
      false,
    );
  });

  it('rejects fractional or out-of-range hours', () => {
    expect(createServiceOrderSchema.safeParse({ ...base, hours: 1.5 }).success).toBe(false);
    expect(createServiceOrderSchema.safeParse({ ...base, hours: 0 }).success).toBe(false);
    expect(createServiceOrderSchema.safeParse({ ...base, hours: 9 }).success).toBe(false);
  });
});
