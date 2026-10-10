import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  PublicSettingsDto,
  CategoryDto,
  ListQuery,
  Page,
  ProductDto,
  WorkerSummaryDto,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

const ONE_HOUR = 60 * 60_000;

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<CategoryDto[]>('/categories'),
    staleTime: ONE_HOUR,
  });
}

export type ProductsParams = Partial<
  Pick<ListQuery, 'q' | 'category' | 'workerId' | 'sort' | 'page'>
>;

export function useProducts(params: ProductsParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () =>
      apiRequest<Page<ProductDto>>('/products', { query: { ...params, pageSize: 12 } }),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiRequest<ProductDto>(`/products/${id}`, { auth: true }),
    enabled: Boolean(id),
  });
}

export function useWorker(id: string | undefined) {
  return useQuery({
    queryKey: ['worker', id],
    queryFn: () => apiRequest<WorkerSummaryDto>(`/workers/${id}`),
    enabled: Boolean(id),
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest<PublicSettingsDto>('/settings'),
    staleTime: 60_000,
  });
}
