import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../config.js';
import {
  createTestApp,
  login,
  makeWorker,
  nextPhone,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { assertCanActOnAdmin } from './guards.js';

const ADMIN_PHONE = '+998905550077';

let t: TestApp;
let admin: Session;
let customer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, null);
  customer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('ADMIN_PHONES configuration', () => {
  it('accepts +998 numbers in any common formatting and normalises them', () => {
    const config = loadConfig({ NODE_ENV: 'test', ADMIN_PHONES: ' 90 555 00 77 , +998901112233' });
    expect(config.adminPhones).toEqual(['+998905550077', '+998901112233']);
  });

  it('refuses a value that is not an Uzbek number', () => {
    expect(() => loadConfig({ NODE_ENV: 'test', ADMIN_PHONES: 'admin' })).toThrow();
  });

  it('is empty by default, so nobody is an administrator', async () => {
    expect(loadConfig({ NODE_ENV: 'test' }).adminPhones).toEqual([]);
    const open = await createTestApp({ ADMIN_PHONES: '' });
    try {
      const who = await login(open.app, ADMIN_PHONE);
      const me = await request(open.app).get('/api/me').set(bearer(who));
      expect(me.body.role).toBe('customer');
      expect((await request(open.app).get('/api/admin/stats').set(bearer(who))).status).toBe(403);
    } finally {
      await open.close();
    }
  });
});

describe('role resolution on sign-in', () => {
  it('gives the listed number the admin role and the configured profile name', async () => {
    const me = await request(t.app).get('/api/me').set(bearer(admin));
    expect(me.body.role).toBe('admin');
    expect(me.body.name).toBe('Hojiakbar');
  });

  it('promotes a freshly listed number on its next sign-in', async () => {
    const phone = nextPhone();
    const listed = await createTestApp({ ADMIN_PHONES: phone });
    try {
      const first = await login(listed.app, phone);
      expect((await request(listed.app).get('/api/me').set(bearer(first))).body.role).toBe('admin');
      const row = await listed.db
        .selectFrom('users')
        .select('role')
        .where('phone', '=', phone)
        .executeTakeFirstOrThrow();
      expect(row.role).toBe('admin');
    } finally {
      await listed.close();
    }
  });

  it('keeps the database role in step with the list', async () => {
    const phone = nextPhone();
    const first = await login(t.app, phone);
    await t.db.updateTable('users').set({ role: 'admin' }).where('phone', '=', phone).execute();
    const again = await login(t.app, phone);
    expect((await request(t.app).get('/api/me').set(bearer(again))).body.role).toBe('customer');
    expect((await request(t.app).get('/api/me').set(bearer(first))).body.role).toBe('customer');
  });
});

describe('admin endpoints', () => {
  it('answer 401 without a token and 403 for an ordinary user', async () => {
    expect((await request(t.app).get('/api/admin/stats')).status).toBe(401);
    const res = await request(t.app).get('/api/admin/stats').set(bearer(customer));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await request(t.app).get('/api/admin/audit').set(bearer(customer))).status).toBe(403);
  });

  it('answer 200 for the administrator', async () => {
    expect((await request(t.app).get('/api/admin/stats').set(bearer(admin))).status).toBe(200);
    expect((await request(t.app).get('/api/admin/audit').set(bearer(admin))).status).toBe(200);
  });
});

describe('audit log', () => {
  it('records an approval with who, what and when, and never the phone number', async () => {
    const worker = await makeWorker(t, 'Audit Usta', { approved: false });
    const res = await request(t.app)
      .post(`/api/admin/workers/${worker.workerId}/approve`)
      .set(bearer(admin));
    expect(res.status).toBe(204);

    const page = await request(t.app).get('/api/admin/audit').set(bearer(admin));
    const entry = page.body.items.find(
      (item: { targetId: string }) => item.targetId === worker.workerId,
    );
    expect(entry).toMatchObject({
      action: 'worker.approve',
      targetType: 'worker',
      adminName: 'Hojiakbar',
      details: { status: 'approved', reason: null },
    });
    expect(JSON.stringify(page.body)).not.toContain(worker.phone.slice(4));
    expect(JSON.stringify(page.body)).not.toContain(ADMIN_PHONE.slice(4));
  });

  it('records a rejection with its reason', async () => {
    const worker = await makeWorker(t, 'Rad Usta', { approved: false });
    await request(t.app)
      .post(`/api/admin/workers/${worker.workerId}/reject`)
      .set(bearer(admin))
      .send({ reason: 'Profil maʼlumotlari toʻliq emas' });
    const row = await t.db
      .selectFrom('audit_log')
      .selectAll()
      .where('target_id', '=', worker.workerId)
      .executeTakeFirstOrThrow();
    expect(row.action).toBe('worker.reject');
    expect(row.admin_user_id).toBe(admin.userId);
    expect(row.details).toMatchObject({ reason: 'Profil maʼlumotlari toʻliq emas' });
  });
});

describe('administrator safety', () => {
  it('never lets an administrator act on themselves or remove the last administrator', async () => {
    await expect(assertCanActOnAdmin(t.db, admin.userId, admin.userId)).rejects.toMatchObject({
      code: 'CANNOT_ACT_ON_SELF',
    });
    await expect(assertCanActOnAdmin(t.db, customer.userId, admin.userId)).rejects.toMatchObject({
      code: 'LAST_ADMIN',
    });
    await expect(assertCanActOnAdmin(t.db, admin.userId, customer.userId)).resolves.toBeUndefined();
  });
});
