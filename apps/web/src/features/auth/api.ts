import type {
  AuthResponse,
  BecomeWorkerInput,
  LoginInput,
  UserDto,
  WorkerProfileInput,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

/** Phone sign-in; the first sign-in creates the account. */
export const login = (input: LoginInput) =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });

/** /admin-kirish: only ADMIN_PHONES numbers get a session. */
export const adminLogin = (input: LoginInput) =>
  apiRequest<AuthResponse>('/auth/admin/login', { method: 'POST', body: { phone: input.phone } });

export const becomeWorker = (input: BecomeWorkerInput) =>
  apiRequest<UserDto>('/me/worker', { method: 'POST', body: input, auth: true });

export const updateProfile = (input: { name: string; language?: 'uz' | 'ru' }) =>
  apiRequest<UserDto>('/me', { method: 'PATCH', body: input, auth: true });

export const updateWorkerProfile = (input: WorkerProfileInput) =>
  apiRequest<UserDto>('/me/worker', { method: 'PATCH', body: input, auth: true });
