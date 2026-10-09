import { useQuery } from '@tanstack/react-query';
import type { WorkerSummaryDto } from '@barakali/shared';
import { apiRequest } from '../../lib/api';

export function useFeaturedWorkers() {
  return useQuery({
    queryKey: ['workers', 'featured'],
    queryFn: () => apiRequest<WorkerSummaryDto[]>('/workers/featured'),
    staleTime: 5 * 60_000,
  });
}
