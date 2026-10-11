import type { UserDto } from '@barakali/shared';
import type { Db } from '../../db/client.js';

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  role: UserDto['role'];
  language: UserDto['language'];
  worker_id: string | null;
  worker_name: string | null;
  worker_status: UserDto['workerStatus'];
  reject_reason: string | null;
  worker_telegram_username: string | null;
}

function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    role: row.role,
    language: row.language,
    workerId: row.worker_id,
    workerName: row.worker_name,
    workerStatus: row.worker_status,
    workerRejectReason:
      row.worker_status === 'rejected' || row.worker_status === 'suspended'
        ? row.reject_reason
        : null,
    workerTelegramUsername: row.worker_telegram_username,
  };
}

export class AuthRepository {
  constructor(private readonly db: Db) {}

  async findUserById(id: string): Promise<UserDto | undefined> {
    const row = await this.userQuery().where('u.id', '=', id).executeTakeFirst();
    return row ? toUserDto(row) : undefined;
  }

  async findUserByPhone(phone: string): Promise<UserDto | undefined> {
    const row = await this.userQuery().where('u.phone', '=', phone).executeTakeFirst();
    return row ? toUserDto(row) : undefined;
  }

  async createUser(
    phone: string,
    name: string | null,
    role: 'customer' | 'admin',
  ): Promise<string> {
    const row = await this.db
      .insertInto('users')
      .values({ phone, name, role })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }

  async isBlocked(userId: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('users')
      .select('blocked_at')
      .where('id', '=', userId)
      .executeTakeFirst();
    return row?.blocked_at != null;
  }

  async setRole(userId: string, role: 'customer' | 'worker' | 'admin'): Promise<void> {
    await this.db.updateTable('users').set({ role }).where('id', '=', userId).execute();
  }

  /** One name per person: a worker's public display name follows the profile name. */
  async updateProfile(userId: string, name: string, language?: 'uz' | 'ru'): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('users')
        .set(language ? { name, language } : { name })
        .where('id', '=', userId)
        .execute();
      await trx
        .updateTable('workers')
        .set({ display_name: name })
        .where('user_id', '=', userId)
        .execute();
    });
  }

  async insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db
      .insertInto('refresh_tokens')
      .values({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
      .execute();
  }

  async findRefreshToken(tokenHash: string) {
    return this.db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();
  }

  /** Atomically revokes a token; returns false when it was already revoked (reuse). */
  async revokeRefreshToken(tokenHash: string): Promise<boolean> {
    const result = await this.db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) === 1;
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();
  }

  private userQuery() {
    return this.db
      .selectFrom('users as u')
      .leftJoin('workers as w', 'w.user_id', 'u.id')
      .select([
        'u.id',
        'u.phone',
        'u.name',
        'u.role',
        'u.language',
        'w.id as worker_id',
        'w.display_name as worker_name',
        'w.status as worker_status',
        'w.reject_reason',
        'w.telegram_username as worker_telegram_username',
      ]);
  }
}
