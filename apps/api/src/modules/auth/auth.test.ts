import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, nextPhone, type TestApp } from '../../testing/helpers.js';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: '+998909999999' });
});
afterAll(() => t.close());

/** Phone sign-in: no SMS code, the first sign-in creates the account. */
function signIn(phone: string, name?: string) {
  return request(t.app)
    .post('/api/auth/login')
    .send({ phone, ...(name ? { name } : {}) });
}

describe('phone login', () => {
  it('creates the user on first sign-in and sets an httpOnly strict refresh cookie', async () => {
    const phone = nextPhone();
    const res = await signIn(phone, 'Madina');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ phone, name: 'Madina', role: 'customer' });
    expect(res.body.accessToken).toBeTruthy();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('signs the same number into the same account and keeps its name', async () => {
    const phone = nextPhone();
    const first = await signIn(phone, 'Madina');
    const again = await signIn(phone, 'Boshqa ism');
    expect(again.body.user.id).toBe(first.body.user.id);
    expect(again.body.user.name).toBe('Madina');
    const rows = await t.db.selectFrom('users').select('id').where('phone', '=', phone).execute();
    expect(rows).toHaveLength(1);
  });

  it('accepts any common phone formatting', async () => {
    const res = await signIn('90 123 45 67');
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('+998901234567');
  });

  it('rejects a malformed phone with a validation error and no account', async () => {
    const res = await signIn('123');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('no longer offers the SMS code endpoints', async () => {
    const phone = nextPhone();
    expect((await request(t.app).post('/api/auth/request-code').send({ phone })).status).toBe(404);
    expect((await request(t.app).post('/api/auth/verify').send({ phone })).status).toBe(404);
  });

  it('promotes ADMIN_PHONES numbers to admin on login', async () => {
    const res = await signIn('+998909999999');
    expect(res.body.user.role).toBe('admin');
  });

  it('limits sign-ins per phone and address', async () => {
    const limited = await createTestApp({ NODE_ENV: 'development' });
    const phone = nextPhone();
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      statuses.push((await request(limited.app).post('/api/auth/login').send({ phone })).status);
    }
    expect(statuses.slice(0, 8).every((status) => status === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    await limited.close();
  });
});

describe('refresh tokens', () => {
  async function session() {
    const phone = nextPhone();
    const res = await signIn(phone);
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
    const verify = await signIn(phone, 'Oyxon');
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
    const verify = await signIn(phone, 'Hunarmand');
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
    const verify = await signIn(phone);
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
