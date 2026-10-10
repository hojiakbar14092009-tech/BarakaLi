import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SMS_CODE_TTL_MINUTES } from '@barakali/shared';
import { buildContext } from '../../app.js';
import { loadConfig } from '../../config.js';
import { createTestApp, nextPhone, type TestApp } from '../../testing/helpers.js';
import { AuthService } from './auth.service.js';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: '+998909999999' });
});
afterAll(() => t.close());

async function requestCode(phone: string) {
  const res = await request(t.app).post('/api/auth/request-code').send({ phone });
  return res.body.code as string;
}

describe('SMS login', () => {
  it('creates the user on first verification and sets an httpOnly strict refresh cookie', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const res = await request(t.app).post('/api/auth/verify').send({ phone, code, name: 'Madina' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ phone, name: 'Madina', role: 'customer' });
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('accepts any common phone formatting', async () => {
    const res = await request(t.app).post('/api/auth/request-code').send({ phone: '90 123 45 67' });
    expect(res.status).toBe(200);
  });

  it('rejects a malformed phone with a validation error', async () => {
    const res = await request(t.app).post('/api/auth/request-code').send({ phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a wrong code and blocks the code after five attempts', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      const res = await request(t.app).post('/api/auth/verify').send({ phone, code: wrong });
      expect(res.body.error.code).toBe('INVALID_CODE');
    }
    const blocked = await request(t.app).post('/api/auth/verify').send({ phone, code });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('does not reuse a code twice', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    await request(t.app).post('/api/auth/verify').send({ phone, code });
    const again = await request(t.app).post('/api/auth/verify').send({ phone, code });
    expect(again.body.error.code).toBe('INVALID_CODE');
  });

  it('stores the code hashed, never in clear text', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const row = await t.db
      .selectFrom('sms_codes')
      .selectAll()
      .where('phone', '=', phone)
      .executeTakeFirstOrThrow();
    expect(row.code_hash).not.toContain(code);
    expect(row.code_hash).toHaveLength(64);
  });

  it('expires the code after five minutes', async () => {
    const phone = nextPhone();
    const config = loadConfig({ NODE_ENV: 'test' });
    const ctx = buildContext({ db: t.db, config });
    let current = new Date();
    const service = new AuthService(ctx, () => current);
    await service.requestCode(phone);
    const stored = await t.db
      .selectFrom('sms_codes')
      .select('id')
      .where('phone', '=', phone)
      .executeTakeFirstOrThrow();
    expect(stored.id).toBeTruthy();
    current = new Date(current.getTime() + (SMS_CODE_TTL_MINUTES + 1) * 60_000);
    await expect(service.verifyCode({ phone, code: '123456' })).rejects.toMatchObject({
      code: 'CODE_EXPIRED',
    });
  });

  it('limits how many codes one phone can request', async () => {
    const phone = nextPhone();
    for (let i = 0; i < 5; i += 1) await requestCode(phone);
    const res = await request(t.app).post('/api/auth/request-code').send({ phone });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('promotes ADMIN_PHONES numbers to admin on login', async () => {
    const phone = '+998909999999';
    const code = await requestCode(phone);
    const res = await request(t.app).post('/api/auth/verify').send({ phone, code });
    expect(res.body.user.role).toBe('admin');
  });

  it('never returns the code of an ADMIN_PHONES number, even when codes are exposed', async () => {
    const preview = await createTestApp({
      NODE_ENV: 'development',
      EXPOSE_SMS_CODE: 'true',
      ADMIN_PHONES: '+998909999998',
    });
    const admin = await request(preview.app)
      .post('/api/auth/request-code')
      .send({ phone: '+998909999998' });
    expect(admin.status).toBe(200);
    expect(admin.body.code).toBeUndefined();
    const other = await request(preview.app)
      .post('/api/auth/request-code')
      .send({ phone: nextPhone() });
    expect(other.body.code).toMatch(/^\d{6}$/);
    await preview.close();
  });

  it('hides the code from the response unless the deployment exposes it', async () => {
    const hidden = await createTestApp({ EXPOSE_SMS_CODE: 'false' });
    const res = await request(hidden.app)
      .post('/api/auth/request-code')
      .send({ phone: nextPhone() });
    expect(res.body.code).toBeUndefined();
    await hidden.close();
  });
});

describe('refresh tokens', () => {
  async function session() {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const res = await request(t.app).post('/api/auth/verify').send({ phone, code });
    return String(res.headers['set-cookie']).split(';')[0] ?? '';
  }

  it('rotates the refresh token and detects reuse of the old one', async () => {
    const first = await session();
    const rotated = await request(t.app).post('/api/auth/refresh').set('Cookie', first);
    expect(rotated.status).toBe(200);
    const second = String(rotated.headers['set-cookie']).split(';')[0] ?? '';
    expect(second).not.toBe(first);

    const reuse = await request(t.app).post('/api/auth/refresh').set('Cookie', first);
    expect(reuse.status).toBe(401);
    const afterReuse = await request(t.app).post('/api/auth/refresh').set('Cookie', second);
    expect(afterReuse.status).toBe(401);
  });

  it('rejects refresh without a cookie and clears it on logout', async () => {
    expect((await request(t.app).post('/api/auth/refresh')).status).toBe(401);
    const cookie = await session();
    const out = await request(t.app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    expect((await request(t.app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });
});

describe('profile and roles', () => {
  it('requires a bearer token for /me', async () => {
    expect((await request(t.app).get('/api/me')).status).toBe(401);
    expect((await request(t.app).get('/api/me').set('Authorization', 'Bearer nope')).status).toBe(
      401,
    );
  });

  it('turns a customer into a worker once and rejects a second attempt', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const verify = await request(t.app)
      .post('/api/auth/verify')
      .send({ phone, code, name: 'Oyxon' });
    const token = verify.body.accessToken as string;
    const category = await t.db.selectFrom('categories').select('id').executeTakeFirstOrThrow();
    const body = { displayName: 'Oyxon tikuvchi', categoryId: category.id };
    const first = await request(t.app)
      .post('/api/me/worker')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(first.status).toBe(201);
    expect(first.body.role).toBe('worker');
    expect(first.body.workerId).toBeTruthy();
    const second = await request(t.app)
      .post('/api/me/worker')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_WORKER');
  });
});

describe('worker Telegram handle', () => {
  async function workerToken(): Promise<string> {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const verify = await request(t.app)
      .post('/api/auth/verify')
      .send({ phone, code, name: 'Hunarmand' });
    const token = verify.body.accessToken as string;
    const category = await t.db.selectFrom('categories').select('id').executeTakeFirstOrThrow();
    await request(t.app)
      .post('/api/me/worker')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Hunarmand', categoryId: category.id });
    return token;
  }

  it('accepts a valid handle, strips a leading @, and clears it with null', async () => {
    const token = await workerToken();
    const auth = { Authorization: `Bearer ${token}` };
    const set = await request(t.app)
      .patch('/api/me/worker')
      .set(auth)
      .send({ telegramUsername: '@usta_tikuvchi' });
    expect(set.status).toBe(200);
    expect(set.body.workerTelegramUsername).toBe('usta_tikuvchi');

    const me = await request(t.app).get('/api/me').set(auth);
    expect(me.body.workerTelegramUsername).toBe('usta_tikuvchi');

    const cleared = await request(t.app)
      .patch('/api/me/worker')
      .set(auth)
      .send({ telegramUsername: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.workerTelegramUsername).toBeNull();
  });

  it('rejects a handle that is too short, too long, or has invalid characters', async () => {
    const token = await workerToken();
    const auth = { Authorization: `Bearer ${token}` };
    for (const value of ['abcd', 'a'.repeat(33), 'bad-name', 'has space', '']) {
      const res = await request(t.app)
        .patch('/api/me/worker')
        .set(auth)
        .send({ telegramUsername: value });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('is rejected for a signed-in user with no worker profile', async () => {
    const phone = nextPhone();
    const code = await requestCode(phone);
    const verify = await request(t.app).post('/api/auth/verify').send({ phone, code });
    const res = await request(t.app)
      .patch('/api/me/worker')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .send({ telegramUsername: 'anyvalidname' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('WORKER_REQUIRED');
  });

  it('requires sign-in', async () => {
    const res = await request(t.app)
      .patch('/api/me/worker')
      .send({ telegramUsername: 'anyvalidname' });
    expect(res.status).toBe(401);
  });
});
