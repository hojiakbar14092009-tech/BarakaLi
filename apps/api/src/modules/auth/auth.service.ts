import {
  REFRESH_TOKEN_TTL_DAYS,
  type AuthResponse,
  type LoginInput,
  type UserDto,
} from '@barakali/shared';
import { AppError } from '../../errors.js';
import type { AppContext } from '../../context.js';
import { AuthRepository } from './auth.repository.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export interface IssuedSession {
  response: AuthResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class AuthService {
  private readonly repo: AuthRepository;

  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.repo = new AuthRepository(ctx.db);
  }

  /**
   * Phone-number sign-in, no SMS code (an owner decision, see docs/DECISIONS.md): the first
   * sign-in creates the account. Blocked accounts are refused; the auth rate limit still applies.
   */
  async login(input: LoginInput): Promise<IssuedSession> {
    const user = await this.findOrCreateUser(input);
    if (await this.repo.isBlocked(user.id)) throw new AppError('USER_BLOCKED', 403);
    return this.issueSession(user);
  }

  /** /admin-kirish: only ADMIN_PHONES numbers get in; others get a clear answer and no session. */
  async adminLogin(phone: string): Promise<IssuedSession> {
    const { adminPhones } = this.ctx.config;
    if (adminPhones.length === 0) throw new AppError('ADMIN_LOGIN_NOT_CONFIGURED', 503);
    if (!adminPhones.includes(phone)) throw new AppError('NOT_ADMIN_PHONE', 403);
    return this.login({ phone });
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw AppError.unauthenticated();
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findRefreshToken(tokenHash);
    if (!stored) throw AppError.unauthenticated();
    if (stored.revoked_at) {
      await this.repo.revokeAllRefreshTokens(stored.user_id);
      throw AppError.unauthenticated();
    }
    if (stored.expires_at.getTime() <= this.now().getTime()) throw AppError.unauthenticated();
    if (!(await this.repo.revokeRefreshToken(tokenHash))) throw AppError.unauthenticated();
    const user = await this.repo.findUserById(stored.user_id);
    if (!user || (await this.repo.isBlocked(user.id))) throw AppError.unauthenticated();
    return this.issueSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.repo.revokeRefreshToken(hashToken(refreshToken));
  }

  async getUser(userId: string): Promise<UserDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw AppError.unauthenticated();
    return user;
  }

  async updateProfile(userId: string, name: string, language?: 'uz' | 'ru'): Promise<UserDto> {
    await this.repo.updateProfile(userId, name, language);
    return this.getUser(userId);
  }

  /**
   * ADMIN_PHONES is the only source of the admin role: a listed number is promoted on every
   * sign-in, a number that left the list is demoted back to its ordinary role, and an empty list
   * means nobody is an administrator.
   */
  private async findOrCreateUser(input: LoginInput): Promise<UserDto> {
    const { adminPhones, adminName } = this.ctx.config;
    const isAdminPhone = adminPhones.includes(input.phone);
    const existing = await this.repo.findUserByPhone(input.phone);
    if (existing) {
      if (isAdminPhone && existing.role !== 'admin') {
        await this.repo.setRole(existing.id, 'admin');
        if (!existing.name) await this.repo.updateProfile(existing.id, adminName);
      }
      if (!isAdminPhone && existing.role === 'admin') {
        await this.repo.setRole(existing.id, existing.workerId ? 'worker' : 'customer');
      }
      return this.getUser(existing.id);
    }
    const id = await this.repo.createUser(
      input.phone,
      input.name ?? (isAdminPhone ? adminName : null),
      isAdminPhone ? 'admin' : 'customer',
    );
    return this.getUser(id);
  }

  private async issueSession(user: UserDto): Promise<IssuedSession> {
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(this.now().getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);
    await this.repo.insertRefreshToken(user.id, hashToken(refreshToken), refreshExpiresAt);
    const accessToken = signAccessToken(
      { userId: user.id, role: user.role },
      this.ctx.config.jwtAccessSecret,
    );
    return { response: { accessToken, user }, refreshToken, refreshExpiresAt };
  }
}
