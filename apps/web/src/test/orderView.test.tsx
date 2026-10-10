import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderDto } from '@barakali/shared';
import '../i18n';
import { ServiceDetails } from '../features/orders/ServiceDetails';

const serviceOrder: OrderDto = {
  id: 'order-2',
  type: 'service',
  status: 'accepted',
  viewerRole: 'customer',
  total: 120_000,
  commission: 6_000,
  workerAmount: 114_000,
  fulfillment: 'pickup',
  deliveryAddress: null,
  items: [],
  counterpart: { name: 'Dilfuza', phone: null },
  paymentStatus: 'paid',
  review: null,
  complaint: null,
  startTime: '2030-03-04T05:00:00.000Z',
  endTime: '2030-03-04T08:00:00.000Z',
  description: 'Atlasdan koʻylak tikish',
  deadline: '2030-03-10',
  images: ['/api/files/a.webp', '/api/files/b.webp'],
  createdAt: '2030-03-01T00:00:00.000Z',
};

describe('ServiceDetails', () => {
  it('shows the slot in Tashkent time, the brief, the deadline and the photos', () => {
    render(<ServiceDetails order={serviceOrder} />);
    // 05:00–08:00 UTC is 10:00–13:00 in Asia/Tashkent.
    expect(screen.getByText('10:00–13:00')).toBeInTheDocument();
    expect(screen.getByText('Atlasdan koʻylak tikish')).toBeInTheDocument();
    expect(screen.getByText(/Qachongacha kerak/)).toBeInTheDocument();
    const photos = screen.getAllByRole('img');
    expect(photos).toHaveLength(2);
    for (const photo of photos) {
      expect(photo).toHaveAttribute('alt');
      expect(photo).toHaveAttribute('width');
      expect(photo).toHaveAttribute('height');
      expect(photo).toHaveAttribute('loading', 'lazy');
    }
  });

  it('renders nothing for a product order', () => {
    const { container } = render(
      <ServiceDetails
        order={{ ...serviceOrder, type: 'product', startTime: null, endTime: null }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('prints the description as plain text, never as markup', () => {
    render(
      <ServiceDetails order={{ ...serviceOrder, description: '<img src=x onerror=alert(1)>' }} />,
    );
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });
});
