import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CardPaymentInput,
  ComplaintDto,
  ComplaintInput,
  CreateOrdersInput,
  EarningsDto,
  OrderAction,
  OrderDto,
  PaymentSessionDto,
  ReviewDto,
  ReviewInput,
} from '@barakali/shared';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

export type OrderSide = 'customer' | 'worker';

export function useOrders(side: OrderSide) {
  const enabled = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: ['orders', side],
    queryFn: () => apiRequest<OrderDto[]>('/orders', { auth: true, query: { as: side } }),
    enabled,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => apiRequest<OrderDto>(`/orders/${id}`, { auth: true }),
    enabled: Boolean(id),
  });
}

export function useCreateOrders() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrdersInput) =>
      apiRequest<OrderDto[]>('/orders', { method: 'POST', body: input, auth: true }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useOrderAction(orderId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: OrderAction) =>
      apiRequest<OrderDto>(`/orders/${orderId}/actions`, {
        method: 'POST',
        body: { action },
        auth: true,
      }),
    onSuccess: (order) => {
      client.setQueryData(['order', orderId], order);
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

export function useStartPayment(orderId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<PaymentSessionDto>(`/orders/${orderId}/payment`, { method: 'POST', auth: true }),
  });
}

export function useConfirmPayment(orderId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (card: CardPaymentInput) =>
      apiRequest<OrderDto>(`/orders/${orderId}/payment/confirm`, {
        method: 'POST',
        body: card,
        auth: true,
      }),
    onSuccess: (order) => {
      client.setQueryData(['order', orderId], order);
      void client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useEarnings() {
  return useQuery({
    queryKey: ['earnings'],
    queryFn: () => apiRequest<EarningsDto>('/earnings', { auth: true }),
  });
}

export function useCreateReview(orderId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) =>
      apiRequest<ReviewDto>(`/orders/${orderId}/review`, {
        method: 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['order', orderId] });
      void client.invalidateQueries({ queryKey: ['orders'] });
      // The worker's rating changed, so cached profiles and listings are stale.
      void client.invalidateQueries({ queryKey: ['worker'] });
      void client.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}

export function useCreateComplaint(orderId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ComplaintInput) =>
      apiRequest<ComplaintDto>(`/orders/${orderId}/complaint`, {
        method: 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
