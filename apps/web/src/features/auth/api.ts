import type {
  AuthResponse,
  BecomeWorkerInput,
  RequestCodeResponse,
  UserDto,
  VerifyCodeInput,
  WorkerProfileInput,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

export const requestCode = (phone: string) =>
  apiRequest<RequestCodeResponse>('/auth/request-code', { method: 'POST', body: { phone } });

/** /admin-kirish: answers only for ADMIN_PHONES numbers. */
export const requestAdminCode = (phone: string) =>
  apiRequest<RequestCodeResponse>('/auth/admin/request-code', { method: 'POST', body: { phone } });

export type CodeSender = (phone: string) => Promise<RequestCodeResponse>;

export const verifyCode = (input: Omit<VerifyCodeInput, 'phone'> & { phone: string }) =>
  apiRequest<AuthResponse>('/auth/verify', { method: 'POST', body: input });

export const becomeWorker = (input: BecomeWorkerInput) =>
  apiRequest<UserDto>('/me/worker', { method: 'POST', body: input, auth: true });

export const updateProfile = (input: { name: string; language?: 'uz' | 'ru' }) =>
  apiRequest<UserDto>('/me', { method: 'PATCH', body: input, auth: true });

export const updateWorkerProfile = (input: WorkerProfileInput) =>
  apiRequest<UserDto>('/me/worker', { method: 'PATCH', body: input, auth: true });
