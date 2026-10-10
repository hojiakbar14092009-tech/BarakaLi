import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminComplaintDto,
  AdminMaterialOrderDto,
  AdminOrderDto,
  AdminReviewDto,
  AdminStatsDto,
  AdminWorkerDto,
  MaterialDto,
  MaterialInputRaw,
  Page,
  ReviewStatus,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

const ADMIN = ['admin'] as const;

function usePaged<T>(name: string, path: string, page: number, status: string | undefined) {
  return useQuery({
    queryKey: [...ADMIN, name, page, status ?? ''],
    queryFn: () => apiRequest<Page<T>>(path, { auth: true, query: { page, status } }),
  });
}

export const useAdminStats = () =>
  useQuery({
    queryKey: [...ADMIN, 'stats'],
    queryFn: () => apiRequest<AdminStatsDto>('/admin/stats', { auth: true }),
  });

export const useAdminWorkers = (page: number, status?: string) =>
  usePaged<AdminWorkerDto>('workers', '/admin/workers', page, status);
export const useAdminOrders = (page: number, status?: string) =>
  usePaged<AdminOrderDto>('orders', '/admin/orders', page, status);
export const useAdminReviews = (page: number, status?: string) =>
  usePaged<AdminReviewDto>('reviews', '/admin/reviews', page, status);
export const useAdminComplaints = (page: number, status?: string) =>
  usePaged<AdminComplaintDto>('complaints', '/admin/complaints', page, status);

export const useAdminMaterials = () =>
  useQuery({
    queryKey: [...ADMIN, 'materials'],
    queryFn: () => apiRequest<MaterialDto[]>('/admin/materials', { auth: true }),
  });

export const useAdminMaterialOrders = () =>
  useQuery({
    queryKey: [...ADMIN, 'material-orders'],
    queryFn: () => apiRequest<AdminMaterialOrderDto[]>('/admin/material-orders', { auth: true }),
  });

/** One mutation factory: every admin action refreshes all admin lists and the public caches. */
function useAdminAction<TVariables>(request: (variables: TVariables) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ADMIN });
      void client.invalidateQueries({ queryKey: ['workers'] });
      void client.invalidateQueries({ queryKey: ['worker'] });
      void client.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export const useApproveWorker = () =>
  useAdminAction((id: string) =>
    apiRequest<void>(`/admin/workers/${id}/approve`, { method: 'POST', auth: true }),
  );

export const useRejectWorker = () =>
  useAdminAction(({ id, reason }: { id: string; reason: string }) =>
    apiRequest<void>(`/admin/workers/${id}/reject`, {
      method: 'POST',
      body: { reason },
      auth: true,
    }),
  );

export const useSetReviewStatus = () =>
  useAdminAction(({ id, status }: { id: string; status: ReviewStatus }) =>
    apiRequest<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  );

export const useResolveComplaint = () =>
  useAdminAction(({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) =>
    apiRequest<void>(`/admin/complaints/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  );

export const useRefundOrder = () =>
  useAdminAction((orderId: string) =>
    apiRequest<void>(`/admin/orders/${orderId}/refund`, { method: 'POST', auth: true }),
  );

export const useSaveMaterial = () =>
  useAdminAction(({ id, input }: { id?: string; input: MaterialInputRaw }) =>
    apiRequest<MaterialDto>(id ? `/admin/materials/${id}` : '/admin/materials', {
      method: id ? 'PUT' : 'POST',
      body: input,
      auth: true,
    }),
  );

export const useDeliverMaterialOrder = () =>
  useAdminAction((id: string) =>
    apiRequest<void>(`/admin/material-orders/${id}/deliver`, { method: 'POST', auth: true }),
  );
