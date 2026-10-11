import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, nextPhone, type TestApp } from '../../testing/helpers.js';

const ADMIN = '+998909999977';

// One database for the tests that run with the usual settings; each fresh one replays every
// migration, which is the slow part of these tests.
let listed: TestApp;
beforeAll(async () => {
  listed = await createTestApp({ NODE_ENV: 'development', ADMIN_PHONES: ADMIN });
});
afterAll(() => listed.close());
afterEach(() => vi.restoreAllMocks());

const adminLogin = (t: TestApp, phone: string) =>
  request(t.app).post('/api/auth/admin/login').send({ phone });

describe('/admin-kirish sign-in', () => {
  it('signs an ADMIN_PHONES number straight in as admin, without logging the number', async () => {
    const out = vi.spyOn(process.stdout, 'write');
    const res = await adminLogin(listed, ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly');
    const panel = await request(listed.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(panel.status).toBe(200);

    const logged = out.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).not.toContain(ADMIN.slice(4));
  });

  it('refuses a number outside the list and creates no account for it', async () => {
    const stranger = nextPhone();
    const res = await adminLogin(listed, stranger);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ADMIN_PHONE');
    expect(res.body.accessToken).toBeUndefined();
    const rows = await listed.db
      .selectFrom('users')
      .select('id')
      .where('phone', '=', stranger)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it('says admin sign-in is not set up while ADMIN_PHONES is empty', async () => {
    const t = await createTestApp({ NODE_ENV: 'development', ADMIN_PHONES: '' });
    const res = await adminLogin(t, ADMIN);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ADMIN_LOGIN_NOT_CONFIGURED');
    await t.close();
  });

  it('never lets a customer into the admin API', async () => {
    const session = await request(listed.app)
      .post('/api/auth/login')
      .send({ phone: nextPhone(), name: 'Mijoz' });
    expect(session.body.user.role).toBe('customer');
    const panel = await request(listed.app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${session.body.accessToken}`);
    expect(panel.status).toBe(403);
  });
});
