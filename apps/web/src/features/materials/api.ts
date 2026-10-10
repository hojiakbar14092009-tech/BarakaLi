import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CardPaymentInput,
  MaterialDto,
  MaterialOrderDto,
  MaterialOrderInput,
  PaymentSessionDto,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';

export const useMaterials = () =>
  useQuery({
    queryKey: ['materials'],
    queryFn: () => apiRequest<MaterialDto[]>('/materials', { auth: true }),
  });

export const useMaterialOrders = () =>
  useQuery({
    queryKey: ['material-orders'],
    queryFn: () => apiRequest<MaterialOrderDto[]>('/material-orders', { auth: true }),
  });

export const useMaterialOrder = (id: string) =>
  useQuery({
    queryKey: ['material-order', id],
    queryFn: () => apiRequest<MaterialOrderDto>(`/material-orders/${id}`, { auth: true }),
  });

export function useCreateMaterialOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialOrderInput) =>
      apiRequest<MaterialOrderDto>('/material-orders', {
        method: 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['material-orders'] }),
  });
}

export const useStartMaterialPayment = (id: string) =>
  useMutation({
    mutationFn: () =>
      apiRequest<PaymentSessionDto>(`/material-orders/${id}/payment`, {
        method: 'POST',
        auth: true,
      }),
  });

export function useConfirmMaterialPayment(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (card: CardPaymentInput) =>
      apiRequest<MaterialOrderDto>(`/material-orders/${id}/payment/confirm`, {
        method: 'POST',
        body: card,
        auth: true,
      }),
    onSuccess: (order) => {
      client.setQueryData(['material-order', id], order);
      void client.invalidateQueries({ queryKey: ['material-orders'] });
      // Stock moved, so the catalog the worker sees is stale.
      void client.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
