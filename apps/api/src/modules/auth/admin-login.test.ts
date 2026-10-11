import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, nextPhone, type TestApp } from '../../testing/helpers.js';

const ADMIN = '+998909999977';
let opened: TestApp[] = [];

async function app(env: Record<string, string>): Promise<TestApp> {
  const created = await createTestApp({ NODE_ENV: 'development', ...env });
  opened.push(created);
  return created;
}

// One database for the tests that run with the usual settings; each fresh one replays every
// migration, which is the slow part of these tests.
let listed: TestApp;
beforeAll(async () => {
  listed = await createTestApp({
    NODE_ENV: 'development',
    ADMIN_PHONES: ADMIN,
    EXPOSE_SMS_CODE: 'true',
  });
});
afterAll(() => listed.close());

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(opened.map((t) => t.close()));
  opened = [];
});

const askAdminCode = (t: TestApp, phone: string) =>
  request(t.app).post('/api/auth/admin/request-code').send({ phone });

describe('/admin-kirish code request', () => {
  it('shows the code for an ADMIN_PHONES number and signs in as admin', async () => {
    const out = vi.spyOn(process.stdout, 'write');
    const t = listed;
    const sent = await askAdminCode(t, ADMIN);
    expect(sent.status).toBe(200);
    const code = sent.body.code as string;
    expect(code).toMatch(/^\d{6}$/);

    const verified = await request(t.app).post('/api/auth/verify').send({ phone: ADMIN, code });
    expect(verified.body.user.role).toBe('admin');
    const panel = await request(t.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${verified.body.accessToken}`);
    expect(panel.status).toBe(200);

    // Neither the number nor the code ever reaches the server log.
    const logged = out.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).not.toContain(ADMIN.slice(4));
    expect(logged).not.toContain(code);
  });

  it('gives no code to a number outside the list', async () => {
    const t = listed;
    const stranger = nextPhone();
    const res = await askAdminCode(t, stranger);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ADMIN_PHONE');
    expect(res.body.code).toBeUndefined();
    const rows = await t.db
      .selectFrom('sms_codes')
      .select('id')
      .where('phone', '=', stranger)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it('says admin sign-in is not set up while ADMIN_PHONES is empty', async () => {
    const t = await app({ ADMIN_PHONES: '', EXPOSE_SMS_CODE: 'true' });
    const res = await askAdminCode(t, ADMIN);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ADMIN_LOGIN_NOT_CONFIGURED');
  });

  it('keeps the code off the page once EXPOSE_SMS_CODE is off', async () => {
    const t = await app({ ADMIN_PHONES: ADMIN, EXPOSE_SMS_CODE: 'false' });
    const res = await askAdminCode(t, ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.code).toBeUndefined();
  });

  it('never lets a customer into the admin API', async () => {
    const t = listed;
    const phone = nextPhone();
    const { body } = await request(t.app).post('/api/auth/request-code').send({ phone });
    const session = await request(t.app)
      .post('/api/auth/verify')
      .send({ phone, code: body.code, name: 'Mijoz' });
    expect(session.body.user.role).toBe('customer');
    const panel = await request(t.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${session.body.accessToken}`);
    expect(panel.status).toBe(403);
  });
});
