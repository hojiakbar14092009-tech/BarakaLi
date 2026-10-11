import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationsDto } from '@barakali/shared';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

const KEY = ['notifications'] as const;
const REFRESH_MS = 60_000;

export function useNotifications() {
  const enabled = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiRequest<NotificationsDto>('/my/notifications', { auth: true }),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}

/** Opening the materials page (store or admin list) counts as having seen its notices. */
export function useMarkMaterialsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<void>('/my/notifications/materials/read', { method: 'POST', auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** Opening an order counts as having seen its notifications. */
export function useMarkOrderRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiRequest<void>(`/my/notifications/orders/${orderId}/read`, { method: 'POST', auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
