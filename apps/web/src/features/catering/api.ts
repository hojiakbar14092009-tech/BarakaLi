import type { CateringRequestRaw } from '@barakali/shared';
import { apiRequest } from '../../lib/api';

export const createCateringRequest = (input: CateringRequestRaw) =>
  apiRequest<{ id: string }>('/catering-requests', { method: 'POST', body: input });
