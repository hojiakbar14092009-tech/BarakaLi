import { randomInt } from 'node:crypto';
import {
  REFRESH_TOKEN_TTL_DAYS,
  SMS_CODE_LENGTH,
  SMS_CODE_TTL_MINUTES,
  SMS_MAX_ATTEMPTS,
  type AuthResponse,
  type RequestCodeResponse,
  type UserDto,
  type VerifyCodeInput,
} from '@barakali/shared';
import { AppError } from '../../errors.js';
import { logger } from '../../logger.js';
import type { AppContext } from '../../context.js';
import { AuthRepository } from './auth.repository.js';
import { generateRefreshToken, hashCode, hashToken, safeEqual, signAccessToken } from './tokens.js';

const MAX_CODES_PER_WINDOW = 5;
const CODE_WINDOW_MINUTES = 15;
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

  async requestCode(phone: string): Promise<RequestCodeResponse> {
    const windowStart = new Date(this.now().getTime() - CODE_WINDOW_MINUTES * MINUTE_MS);
    if ((await this.repo.countRecentCodes(phone, windowStart)) >= MAX_CODES_PER_WINDOW) {
      throw new AppError('RATE_LIMITED', 429);
    }
    const code = String(randomInt(0, 10 ** SMS_CODE_LENGTH)).padStart(SMS_CODE_LENGTH, '0');
    const expiresAt = new Date(this.now().getTime() + SMS_CODE_TTL_MINUTES * MINUTE_MS);
    await this.repo.insertCode(
      phone,
      hashCode(phone, code, this.ctx.config.jwtRefreshSecret),
      expiresAt,
    );
    await this.ctx.sms.send(phone, code);
    const response: RequestCodeResponse = { expiresInSeconds: SMS_CODE_TTL_MINUTES * 60 };
    if (this.ctx.config.exposeSmsCode && !this.withholdFromResponse(phone, code)) {
      response.code = code;
    }
    return response;
  }

  /**
   * The exposed-code preview mode would let anyone sign in as an administrator, so codes for
   * ADMIN_PHONES numbers are never put in a response (only NODE_ENV=test may). Without an SMS
   * gateway the administrator reads the one-time code from the server log instead.
   */
  private withholdFromResponse(phone: string, code: string): boolean {
    const { adminPhones, nodeEnv } = this.ctx.config;
    if (!adminPhones.includes(phone) || nodeEnv === 'test') return false;
    logger.info('Administrator sign-in code issued', { code });
    return true;
  }

  async verifyCode(input: VerifyCodeInput): Promise<IssuedSession> {
    await this.checkCode(input.phone, input.code);
    const user = await this.findOrCreateUser(input);
    if (await this.repo.isBlocked(user.id)) throw new AppError('USER_BLOCKED', 403);
    return this.issueSession(user);
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

  private async checkCode(phone: string, code: string): Promise<void> {
    const stored = await this.repo.findActiveCode(phone);
    if (!stored) throw new AppError('INVALID_CODE', 400);
    if (stored.attempts >= SMS_MAX_ATTEMPTS) throw new AppError('TOO_MANY_ATTEMPTS', 429);
    if (stored.expires_at.getTime() <= this.now().getTime())
      throw new AppError('CODE_EXPIRED', 400);
    const expected = hashCode(phone, code, this.ctx.config.jwtRefreshSecret);
    if (!safeEqual(stored.code_hash, expected)) {
      await this.repo.incrementAttempts(stored.id);
      throw new AppError('INVALID_CODE', 400);
    }
    if (!(await this.repo.consumeCode(stored.id))) throw new AppError('INVALID_CODE', 400);
  }

  /**
   * ADMIN_PHONES is the only source of the admin role: a listed number is promoted on every
   * sign-in, a number that left the list is demoted back to its ordinary role, and an empty list
   * means nobody is an administrator.
   */
  private async findOrCreateUser(input: VerifyCodeInput): Promise<UserDto> {
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
