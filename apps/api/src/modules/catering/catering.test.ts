import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tashkentToday } from '@barakali/shared';
import { CATERING_REQUESTS_PER_WINDOW, cateringLimiter } from '../../middleware/rate-limit.js';
import { createTestApp, type TestApp } from '../../testing/helpers.js';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.close());

function daysFromToday(days: number): string {
  const date = new Date(`${tashkentToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const valid = () => ({
  name: 'Malika Karimova',
  phone: '90 765 43 21',
  serviceTypeId: 'pishiriq',
  eventDate: daysFromToday(10),
  guestsCount: 40,
  note: 'Tugʻilgan kun uchun',
});

const post = (body: object) => request(t.app).post('/api/catering-requests').send(body);

describe('POST /api/catering-requests', () => {
  it('saves a complete request with the phone in +998 form and returns only its id', async () => {
    const res = await post(valid());
    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(['id']);
    const row = await t.db
      .selectFrom('catering_requests')
      .selectAll()
      .where('id', '=', res.body.id)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      name: 'Malika Karimova',
      phone: '+998907654321',
      service_type_id: 'pishiriq',
      guests_count: 40,
      note: 'Tugʻilgan kun uchun',
      status: 'new',
    });
  });

  it('accepts "boshqa" and an empty note', async () => {
    const res = await post({ ...valid(), serviceTypeId: 'boshqa', note: undefined });
    expect(res.status).toBe(201);
  });

  it('rejects a phone that is not an Uzbek mobile number', async () => {
    const res = await post({ ...valid(), phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.phone).toEqual(['INVALID_PHONE']);
  });

  it('rejects zero guests', async () => {
    const res = await post({ ...valid(), guestsCount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('guestsCount');
  });

  it('rejects an event date that is not in the future', async () => {
    for (const eventDate of [daysFromToday(0), daysFromToday(-3)]) {
      const res = await post({ ...valid(), eventDate });
      expect(res.status).toBe(400);
      expect(res.body.error.details.eventDate).toEqual(['DATE_NOT_IN_FUTURE']);
    }
  });

  it('rejects a service type that is not offered', async () => {
    const res = await post({ ...valid(), serviceTypeId: 'masofaviy-ishlar' });
    expect(res.status).toBe(400);
  });

  it('never writes the phone number to the logs', async () => {
    const out = vi.spyOn(process.stdout, 'write');
    const err = vi.spyOn(process.stderr, 'write');
    await post(valid());
    await post({ ...valid(), guestsCount: 0 });
    const written = [...out.mock.calls, ...err.mock.calls].map((call) => String(call[0])).join('');
    out.mockRestore();
    err.mockRestore();
    expect(written).not.toMatch(/907654321/);
  });
});

describe('catering rate limit', () => {
  it('answers 429 after the per-window allowance', async () => {
    const app = express();
    app.post('/x', cateringLimiter(true), (_req, res) => {
      res.status(201).end();
    });
    for (let i = 0; i < CATERING_REQUESTS_PER_WINDOW; i += 1) {
      expect((await request(app).post('/x')).status).toBe(201);
    }
    const blocked = await request(app).post('/x');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
