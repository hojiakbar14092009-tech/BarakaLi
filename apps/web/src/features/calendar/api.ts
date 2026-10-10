import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailabilityDto,
  AvailabilityInput,
  AvailabilityWindowDto,
  CreateServiceOrderRaw,
  OrderDto,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

const MY_AVAILABILITY = ['my-availability'] as const;

export function useMyAvailability() {
  return useQuery({
    queryKey: MY_AVAILABILITY,
    queryFn: () => apiRequest<AvailabilityDto>('/my/availability', { auth: true }),
  });
}

export function useWorkerAvailability(workerId: string | undefined) {
  return useQuery({
    queryKey: ['availability', workerId],
    queryFn: () => apiRequest<AvailabilityDto>(`/workers/${workerId}/availability`),
    enabled: Boolean(workerId),
    staleTime: 0,
  });
}

export function useAddWindow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AvailabilityInput) =>
      apiRequest<AvailabilityWindowDto>('/my/availability', {
        method: 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: MY_AVAILABILITY }),
  });
}

export function useRemoveWindow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/my/availability/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: MY_AVAILABILITY }),
  });
}

export function useCreateServiceOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceOrderRaw) =>
      apiRequest<OrderDto>('/orders/service', { method: 'POST', body: input, auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['orders'] }),
    // A clash means the slot list shown to the customer is stale, so it is reloaded either way.
    onSettled: () => client.invalidateQueries({ queryKey: ['availability'] }),
  });
}

export function useUploadOrderImage() {
  return useMutation({
    mutationFn: (file: Blob) => {
      const formData = new FormData();
      formData.append('image', file, 'photo.jpg');
      return apiRequest<{ url: string }>('/uploads/order-image', {
        method: 'POST',
        formData,
        auth: true,
      });
    },
  });
}
