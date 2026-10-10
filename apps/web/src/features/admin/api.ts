import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAuditEntryDto,
  AdminOrderDetailDto,
  AdminProductDto,
  AdminProductUpdate,
  AdminUserDto,
  OrderStatus,
  RefundDto,
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

function usePaged<T>(
  name: string,
  path: string,
  page: number,
  status: string | undefined,
  q?: string,
) {
  return useQuery({
    queryKey: [...ADMIN, name, page, status ?? '', q ?? ''],
    queryFn: () => apiRequest<Page<T>>(path, { auth: true, query: { page, status, q } }),
  });
}

export const useAdminStats = () =>
  useQuery({
    queryKey: [...ADMIN, 'stats'],
    queryFn: () => apiRequest<AdminStatsDto>('/admin/stats', { auth: true }),
  });

export const useAdminWorkers = (page: number, status?: string, q?: string) =>
  usePaged<AdminWorkerDto>('workers', '/admin/workers', page, status, q);

export const useAdminWorker = (id: string) =>
  useQuery({
    queryKey: [...ADMIN, 'worker', id],
    queryFn: () => apiRequest<AdminWorkerDto>(`/admin/workers/${id}`, { auth: true }),
    enabled: id.length > 0,
  });
export const useAdminOrders = (page: number, status?: string) =>
  usePaged<AdminOrderDto>('orders', '/admin/orders', page, status);
export const useAdminReviews = (page: number, status?: string) =>
  usePaged<AdminReviewDto>('reviews', '/admin/reviews', page, status);
export const useAdminComplaints = (page: number, status?: string) =>
  usePaged<AdminComplaintDto>('complaints', '/admin/complaints', page, status);

export const useAdminAudit = (page: number) =>
  useQuery({
    queryKey: [...ADMIN, 'audit', page],
    queryFn: () =>
      apiRequest<Page<AdminAuditEntryDto>>('/admin/audit', { auth: true, query: { page } }),
  });

export interface ProductListParams {
  page: number;
  status?: string;
  q?: string;
  workerId?: string;
  categoryId?: string;
}

export const useAdminProducts = (params: ProductListParams) =>
  useQuery({
    queryKey: [...ADMIN, 'products', params],
    queryFn: () =>
      apiRequest<Page<AdminProductDto>>('/admin/products', { auth: true, query: { ...params } }),
  });

export const useAdminOrder = (id: string) =>
  useQuery({
    queryKey: [...ADMIN, 'order', id],
    queryFn: () => apiRequest<AdminOrderDetailDto>(`/admin/orders/${id}`, { auth: true }),
    enabled: id.length > 0,
  });

export const useAdminUsers = (page: number, status?: string, q?: string) =>
  usePaged<AdminUserDto>('users', '/admin/users', page, status, q);

export const useAdminUser = (id: string) =>
  useQuery({
    queryKey: [...ADMIN, 'user', id],
    queryFn: () => apiRequest<AdminUserDto>(`/admin/users/${id}`, { auth: true }),
    enabled: id.length > 0,
  });

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
      void client.invalidateQueries({ queryKey: ['products'] });
      void client.invalidateQueries({ queryKey: ['product'] });
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

export const useSuspendWorker = () =>
  useAdminAction(({ id, reason }: { id: string; reason: string }) =>
    apiRequest<void>(`/admin/workers/${id}/suspend`, {
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
  useAdminAction(({ orderId, reason }: { orderId: string; reason?: string }) =>
    apiRequest<RefundDto>(`/admin/orders/${orderId}/refund`, {
      method: 'POST',
      body: reason ? { reason } : {},
      auth: true,
    }),
  );

export const useSetOrderStatus = () =>
  useAdminAction(({ id, status }: { id: string; status: OrderStatus }) =>
    apiRequest<void>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    }),
  );

export const useUpdateProduct = () =>
  useAdminAction(({ id, input }: { id: string; input: AdminProductUpdate }) =>
    apiRequest<void>(`/admin/products/${id}`, { method: 'PATCH', body: input, auth: true }),
  );

export const useSetProductVisible = () =>
  useAdminAction(({ id, visible }: { id: string; visible: boolean }) =>
    apiRequest<void>(`/admin/products/${id}/${visible ? 'show' : 'hide'}`, {
      method: 'POST',
      auth: true,
    }),
  );

export const useDeleteProduct = () =>
  useAdminAction((id: string) =>
    apiRequest<void>(`/admin/products/${id}`, { method: 'DELETE', auth: true }),
  );

export const useBlockUser = () =>
  useAdminAction(({ id, reason }: { id: string; reason: string }) =>
    apiRequest<void>(`/admin/users/${id}/block`, { method: 'POST', body: { reason }, auth: true }),
  );

export const useUnblockUser = () =>
  useAdminAction((id: string) =>
    apiRequest<void>(`/admin/users/${id}/unblock`, { method: 'POST', auth: true }),
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
