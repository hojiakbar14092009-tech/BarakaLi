import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMISSION_RATE_PERCENT, type OrderDto } from '@barakali/shared';
import '../i18n';
import OrderDetailPage from '../features/orders/OrderDetailPage';

const ORDER_ID = '6f1b4f0e-79a1-4a5b-8f0e-3f9d2f3f6a11';

const order = (commissionRate: number, commission: number, workerAmount: number): OrderDto => ({
  id: ORDER_ID,
  type: 'product',
  status: 'accepted',
  viewerRole: 'worker',
  total: 142_500,
  commission,
  commissionRate,
  workerAmount,
  fulfillment: 'pickup',
  deliveryAddress: null,
  items: [],
  counterpart: { name: 'Mijoz', phone: '+998901234567' },
  paymentStatus: 'paid',
  review: null,
  complaint: null,
  startTime: null,
  endTime: null,
  description: null,
  deadline: null,
  images: [],
  createdAt: '2026-01-01T00:00:00.000Z',
});

function renderOrder(dto: OrderDto) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(dto), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/buyurtmalar/${ORDER_ID}`]}>
        <Routes>
          <Route path="/buyurtmalar/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('commission on the order page', () => {
  it('is 2% platform-wide', () => {
    expect(COMMISSION_RATE_PERCENT).toBe(2);
  });

  it('shows the 2% rate and amounts the server computed for a new order', async () => {
    renderOrder(order(0.02, 2_850, 139_650));
    expect(await screen.findByText('Platforma komissiyasi (2%)')).toBeInTheDocument();
    expect(screen.getByText('− 2 850 soʻm')).toBeInTheDocument();
    expect(screen.getByText('139 650 soʻm')).toBeInTheDocument();
  });

  it('keeps showing 5% for an order placed under the old rate', async () => {
    renderOrder(order(0.05, 7_125, 135_375));
    expect(await screen.findByText('Platforma komissiyasi (5%)')).toBeInTheDocument();
    expect(screen.getByText('− 7 125 soʻm')).toBeInTheDocument();
  });
});
