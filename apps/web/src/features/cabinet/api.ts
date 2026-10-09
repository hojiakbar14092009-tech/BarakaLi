import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductDto, ProductInput, ProductStatus } from '@barakali/shared';
import { apiRequest } from '../../lib/api';

const MY_PRODUCTS = ['my-products'] as const;

function useRefresh() {
  const client = useQueryClient();
  return (product?: ProductDto) => {
    void client.invalidateQueries({ queryKey: MY_PRODUCTS });
    void client.invalidateQueries({ queryKey: ['products'] });
    void client.invalidateQueries({ queryKey: ['workers'] });
    if (product) client.setQueryData(['product', product.id], product);
  };
}

export function useMyProducts() {
  return useQuery({
    queryKey: MY_PRODUCTS,
    queryFn: () => apiRequest<ProductDto[]>('/my/products', { auth: true }),
  });
}

export function useSaveProduct() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProductInput }) =>
      apiRequest<ProductDto>(id ? `/my/products/${id}` : '/my/products', {
        method: id ? 'PUT' : 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: refresh,
  });
}

export function useSetStatus() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      apiRequest<ProductDto>(`/my/products/${id}/status`, {
        method: 'PATCH',
        body: { status },
        auth: true,
      }),
    onSuccess: refresh,
  });
}

export function useSetStock() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      apiRequest<ProductDto>(`/my/products/${id}/stock`, {
        method: 'PATCH',
        body: { stock },
        auth: true,
      }),
    onSuccess: refresh,
  });
}

export function useDeleteProduct() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/my/products/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => refresh(),
  });
}

export function useUploadImage(productId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (file: Blob) => {
      const formData = new FormData();
      formData.append('image', file, 'photo.jpg');
      return apiRequest<ProductDto>(`/my/products/${productId}/images`, {
        method: 'POST',
        formData,
        auth: true,
      });
    },
    onSuccess: refresh,
  });
}

export function useDeleteImage(productId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiRequest<ProductDto>(`/my/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
        auth: true,
      }),
    onSuccess: refresh,
  });
}

export function useUploadModel(productId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('model', file, 'model.glb');
      return apiRequest<ProductDto>(`/my/products/${productId}/model`, {
        method: 'PUT',
        formData,
        auth: true,
      });
    },
    onSuccess: refresh,
  });
}

export function useDeleteModel(productId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () =>
      apiRequest<ProductDto>(`/my/products/${productId}/model`, { method: 'DELETE', auth: true }),
    onSuccess: refresh,
  });
}
