import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrderDto } from '@barakali/shared';
import '../i18n';
import { ComplaintSection } from '../features/orders/ComplaintSection';
import { ReviewSection } from '../features/orders/ReviewSection';

const baseOrder: OrderDto = {
  id: 'order-1',
  type: 'product',
  status: 'delivered',
  viewerRole: 'customer',
  total: 100_000,
  commission: 2_000,
  commissionRate: 0.02,
  workerAmount: 98_000,
  fulfillment: 'pickup',
  deliveryAddress: null,
  items: [],
  counterpart: { name: 'Usta', phone: null, telegramUsername: null },
  paymentStatus: 'paid',
  review: null,
  complaint: null,
  startTime: null,
  endTime: null,
  description: null,
  deadline: null,
  images: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function mockFetch(status = 201, body: unknown = {}) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

describe('ReviewSection', () => {
  it('shows nothing before the order is delivered', () => {
    const { container } = renderWithClient(
      <ReviewSection order={{ ...baseOrder, status: 'accepted' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing to the worker while there is no review', () => {
    const { container } = renderWithClient(
      <ReviewSection order={{ ...baseOrder, viewerRole: 'worker' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps submit disabled until a star is chosen and sends the rating', async () => {
    const fetchMock = mockFetch(201, { id: 'r1' });
    renderWithClient(<ReviewSection order={baseOrder} />);

    const submit = screen.getByRole('button', { name: /Bahoni yuborish/ });
    expect(submit).toBeDisabled();

    const stars = screen.getAllByRole('radio');
    expect(stars).toHaveLength(5);
    // 48 px touch targets on phones: size-12 is 3rem.
    for (const star of stars) expect(star).toHaveClass('size-12');

    fireEvent.click(stars[3] as HTMLElement);
    expect(stars[3]).toHaveAttribute('aria-checked', 'true');
    fireEvent.change(screen.getByLabelText(/Izoh/), { target: { value: 'Zoʻr ish' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/orders/order-1/review');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ rating: 4, comment: 'Zoʻr ish' });
  });

  it('shows the saved review instead of the form once it exists', () => {
    renderWithClient(
      <ReviewSection
        order={{
          ...baseOrder,
          review: {
            id: 'r1',
            orderId: 'order-1',
            rating: 5,
            comment: 'Rahmat',
            status: 'visible',
            createdAt: baseOrder.createdAt,
          },
        }}
      />,
    );
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('Rahmat')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /5 yulduz/ })).toBeInTheDocument();
  });

  it('explains a duplicate review with the translated error', async () => {
    mockFetch(409, { error: { code: 'REVIEW_ALREADY_EXISTS' } });
    renderWithClient(<ReviewSection order={baseOrder} />);
    fireEvent.click(screen.getAllByRole('radio')[4] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: /Bahoni yuborish/ }));
    expect(await screen.findByText(/allaqachon baholangan/)).toBeInTheDocument();
  });
});

describe('ComplaintSection', () => {
  it('offers a full-width, 48px+ complaint button on every order', () => {
    renderWithClient(<ComplaintSection order={{ ...baseOrder, status: 'new' }} />);
    const button = screen.getByRole('button', { name: /Shikoyat qilish/ });
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('min-h-14');
  });

  it('sends the complaint and needs at least five characters', async () => {
    const fetchMock = mockFetch(201, { id: 'c1' });
    renderWithClient(<ComplaintSection order={baseOrder} />);
    fireEvent.click(screen.getByRole('button', { name: /Shikoyat qilish/ }));

    const submit = screen.getByRole('button', { name: /Shikoyatni yuborish/ });
    fireEvent.change(screen.getByLabelText(/Shikoyat matni/), { target: { value: 'ha' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Shikoyat matni/), {
      target: { value: 'Buyurtma kech keldi' },
    });
    fireEvent.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/orders/order-1/complaint');
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'Buyurtma kech keldi' });
  });

  it('shows the open complaint instead of the button', () => {
    renderWithClient(
      <ComplaintSection
        order={{
          ...baseOrder,
          complaint: {
            id: 'c1',
            orderId: 'order-1',
            reason: 'Kech keldi',
            status: 'open',
            createdAt: baseOrder.createdAt,
          },
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: /Shikoyat qilish/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Shikoyatingiz qabul qilindi/)).toBeInTheDocument();
    expect(screen.getByText(/Ochiq/)).toBeInTheDocument();
  });
});
