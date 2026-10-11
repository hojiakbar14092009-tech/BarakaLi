import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDto } from '@barakali/shared';
import '../i18n';
import { AdminMaterialOrders } from '../features/admin/AdminMaterialOrders';
import { useAuthStore } from '../stores/auth';
import { mockApi, renderApp } from './adminTestUtils';

const base = {
  total: 17_000,
  items: [{ id: 'i1', materialId: 'm1', name: 'Paxta ip', unitPrice: 8_500, quantity: 2 }],
  workerName: 'Dilfuza',
  workerPhone: '+998901112233',
  shippedAt: null,
  deliveredAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const paid = {
  ...base,
  id: 'mo1',
  status: 'paid',
  deliveryAddress: 'Chilonzor, 9-mavze, 14-uy',
  courier: null,
};
const shipped = {
  ...base,
  id: 'mo2',
  status: 'shipped',
  deliveryAddress: null,
  courier: { name: 'Jasur', phone: '+998907654321' },
  shippedAt: '2026-01-02T09:00:00.000Z',
};
const notifications = {
  unread: 0,
  unreadMaterials: 1,
  items: [
    {
      id: 'n1',
      kind: 'material_order_paid',
      detail: null,
      orderId: null,
      materialOrderId: 'mo1',
      readAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const admin: UserDto = {
  id: 'admin',
  phone: '+998900000000',
  name: 'Hojiakbar',
  role: 'admin',
  language: 'uz',
  workerId: null,
  workerName: null,
  workerStatus: null,
  workerRejectReason: null,
  workerTelegramUsername: null,
};

beforeEach(() => {
  useAuthStore.setState({ status: 'ready', accessToken: 'token', user: admin });
});
afterEach(() => vi.unstubAllGlobals());

function mockOrders() {
  return mockApi({
    'GET /admin/material-orders': () => [paid, shipped],
    'GET /my/notifications': () => notifications,
    'POST /my/notifications/materials/read': () => null,
    'POST /admin/material-orders/mo1/ship': () => null,
    'POST /admin/material-orders/mo2/deliver': () => null,
  });
}

describe('admin materials delivery', () => {
  it('marks the newly paid order, shows how to reach the worker and clears the badge', async () => {
    const fetchMock = mockOrders();
    renderApp(<AdminMaterialOrders />);
    expect(await screen.findByText('Yangi')).toBeInTheDocument();
    const call = screen.getAllByRole('link', { name: 'Hunarmandga qoʻngʻiroq qilish: Dilfuza' });
    expect(call[0]).toHaveAttribute('href', 'tel:+998901112233');
    expect(screen.getByText('Manzil: Chilonzor, 9-mavze, 14-uy')).toBeInTheDocument();
    expect(screen.getByText(/Manzil koʻrsatilmagan/)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/materials/read'))).toBe(
        true,
      ),
    );
  });

  it('sends a paid order out only with a courier name and a valid phone', async () => {
    const fetchMock = mockOrders();
    renderApp(<AdminMaterialOrders />);
    fireEvent.click(await screen.findByRole('button', { name: 'Yoʻlga chiqarish' }));
    const confirm = screen.getByRole('button', {
      name: 'Yoʻlga chiqarish va hunarmandga xabar berish',
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Yetkazib beruvchining ismi'), {
      target: { value: 'Jasur' },
    });
    fireEvent.change(screen.getByLabelText('Yetkazib beruvchining telefoni'), {
      target: { value: '90 765 43 21' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/mo1/ship'));
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        courierName: 'Jasur',
        courierPhone: '+998907654321',
      });
    });
  });

  it('shows the courier of a shipped order and lets it be marked delivered', async () => {
    const fetchMock = mockOrders();
    renderApp(<AdminMaterialOrders />);
    expect(
      await screen.findByText('Yetkazib beruvchi: Jasur, +998 90 765 43 21'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Topshirildi' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/mo2/deliver'))).toBe(true),
    );
  });
});
