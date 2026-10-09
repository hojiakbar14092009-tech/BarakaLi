import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_TTL_SECONDS, USER_ROLES, type UserRole } from '@barakali/shared';

export interface AccessClaims {
  userId: string;
  role: UserRole;
}

export function signAccessToken(claims: AccessClaims, secret: string): string {
  return jwt.sign({ role: claims.role }, secret, {
    subject: claims.userId,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string, secret: string): AccessClaims | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) return null;
    const role = payload.role as UserRole;
    if (!USER_ROLES.includes(role)) return null;
    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashCode(phone: string, code: string, secret: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
