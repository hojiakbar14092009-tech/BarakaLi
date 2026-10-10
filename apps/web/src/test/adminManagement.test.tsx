import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import AdminOrderDetailPage from '../features/admin/AdminOrderDetailPage';
import AdminProductsPage from '../features/admin/AdminProductsPage';
import AdminUserDetailPage from '../features/admin/AdminUserDetailPage';
import { emptyPage, mockApi, renderApp } from './adminTestUtils';

afterEach(() => vi.unstubAllGlobals());

const categories = [
  { id: 'c1', slug: 'tikuvchilik', name: { uz: 'Tikuvchilik', ru: 'Шитьё' } },
  { id: 'c2', slug: 'pishiriq', name: { uz: 'Pishiriq', ru: 'Выпечка' } },
];
const product = {
  id: 'p1',
  title: 'Kashta roʻmol',
  description: '',
  workerId: 'w1',
  workerName: 'Dilfuza',
  categoryId: 'c1',
  categorySlug: 'tikuvchilik',
  retailPrice: 90_000,
  wholesalePrice: null,
  wholesaleMinQty: null,
  stock: 4,
  status: 'published',
  imageUrl: null,
  ordersCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('admin products', () => {
  it('hides a product through a named dialog and lets a product without orders be deleted', async () => {
    const fetchMock = mockApi({
      'GET /categories': () => categories,
      'GET /admin/products': () => ({ ...emptyPage, items: [product], total: 1 }),
      'POST /admin/products/p1/hide': () => null,
      'DELETE /admin/products/p1': () => null,
    });
    renderApp(
      <Routes>
        <Route path="/admin/mahsulotlar" element={<AdminProductsPage />} />
      </Routes>,
      '/admin/mahsulotlar',
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Yashirish: Kashta roʻmol' }));
    const dialog = screen.getByRole('dialog', { name: 'Mahsulotni yashirish' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mahsulotni yashirish' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).endsWith('/admin/products/p1/hide')),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Oʻchirish: Kashta roʻmol' }));
    const confirm = screen.getByRole('dialog', { name: 'Mahsulotni oʻchirish' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Mahsulotni oʻchirish' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/admin/products/p1'));
      expect((call?.[1] as RequestInit).method).toBe('DELETE');
    });
  });

  it('offers only hiding for a product that has orders, and saves edits as whole som', async () => {
    const fetchMock = mockApi({
      'GET /categories': () => categories,
      'GET /admin/products': () => ({
        ...emptyPage,
        items: [{ ...product, ordersCount: 2 }],
        total: 1,
      }),
      'PATCH /admin/products/p1': () => null,
    });
    renderApp(
      <Routes>
        <Route path="/admin/mahsulotlar" element={<AdminProductsPage />} />
      </Routes>,
      '/admin/mahsulotlar',
    );
    expect(await screen.findByText(/buyurtmalarda bor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oʻchirish: Kashta roʻmol' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tahrirlash: Kashta roʻmol' }));
    fireEvent.change(screen.getByLabelText('Narx (soʻm)'), { target: { value: '95000' } });
    // The page filter and the edit form both label a category select; the form's comes last.
    fireEvent.change(screen.getAllByLabelText('Toifa').at(-1) as HTMLElement, {
      target: { value: 'c2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith('/admin/products/p1') && init?.method === 'PATCH',
      );
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        title: 'Kashta roʻmol',
        description: '',
        retailPrice: 95000,
        categoryId: 'c2',
      });
    });
  });
});

describe('admin order detail', () => {
  const order = {
    id: 'o1234567-0000-4000-8000-000000000000',
    type: 'product',
    status: 'new',
    total: 180_000,
    commission: 3_600,
    commissionRate: 0.02,
    workerAmount: 176_400,
    fulfillment: 'pickup',
    deliveryAddress: null,
    startTime: null,
    endTime: null,
    description: null,
    customer: { id: 'u1', name: 'Mijoz', phone: '+998901234567' },
    worker: { id: 'w1', name: 'Dilfuza', phone: '+998907654321' },
    paymentStatus: 'paid',
    items: [
      {
        id: 'i1',
        productId: 'p1',
        title: 'Kashta roʻmol',
        unitPrice: 90_000,
        quantity: 2,
        priceType: 'retail',
      },
    ],
    refunds: [],
    allowedTransitions: ['accepted', 'cancelled'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const route = (
    <Routes>
      <Route path="/admin/buyurtmalar/:id" element={<AdminOrderDetailPage />} />
    </Routes>
  );

  it('offers only the allowed next statuses and confirms the change', async () => {
    const fetchMock = mockApi({
      [`GET /admin/orders/${order.id}`]: () => order,
      [`PATCH /admin/orders/${order.id}/status`]: () => null,
    });
    renderApp(route, `/admin/buyurtmalar/${order.id}`);
    const select = await screen.findByLabelText('Keyingi holat');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Tanlang', 'Qabul qilingan', 'Bekor qilingan']);
    const change = screen.getByRole('button', { name: 'Holatni oʻzgartirish' });
    expect(change).toBeDisabled();
    fireEvent.change(select, { target: { value: 'accepted' } });
    fireEvent.click(change);
    const dialog = screen.getByRole('dialog', { name: 'Buyurtma holatini oʻzgartirish' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Holatni oʻzgartirish' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/status'));
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({ status: 'accepted' });
    });
    expect(screen.getByText('3 600 soʻm', { exact: false })).toBeInTheDocument();
  });

  it('refunds with an optional reason and explains a refused refund', async () => {
    const fetchMock = mockApi({
      [`GET /admin/orders/${order.id}`]: () => order,
      [`POST /admin/orders/${order.id}/refund`]: () => ({
        id: 'r1',
        amount: 180_000,
        commissionReversed: 0,
        reason: 'Shikoyat',
        adminName: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
    });
    renderApp(route, `/admin/buyurtmalar/${order.id}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Pulni qaytarish' }));
    const dialog = screen.getByRole('dialog', { name: 'Pulni qaytarish' });
    const confirm = within(dialog).getByRole('button', { name: 'Pulni qaytarish' });
    expect(confirm).toBeEnabled();
    fireEvent.change(within(dialog).getByLabelText('Sabab (ixtiyoriy)'), {
      target: { value: 'Shikoyat' },
    });
    fireEvent.click(confirm);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/refund'));
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({ reason: 'Shikoyat' });
    });
  });
});

describe('admin user detail', () => {
  it('blocks only with a reason and shows the server refusal for the last admin', async () => {
    const user = {
      id: 'u9',
      name: 'Bloklanadigan',
      phone: '+998901112233',
      role: 'customer',
      language: 'uz',
      workerId: null,
      workerStatus: null,
      ordersCount: 1,
      blockedAt: null,
      blockReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/admin/users/u9') && (init?.method ?? 'GET') === 'GET') {
          return Promise.resolve(new Response(JSON.stringify(user), { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ error: { code: 'LAST_ADMIN' } }), { status: 409 }),
        );
      }),
    );
    renderApp(
      <Routes>
        <Route path="/admin/foydalanuvchilar/:id" element={<AdminUserDetailPage />} />
      </Routes>,
      '/admin/foydalanuvchilar/u9',
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Bloklash: Bloklanadigan' }));
    const dialog = screen.getByRole('dialog', { name: 'Foydalanuvchini bloklash' });
    const confirm = within(dialog).getByRole('button', { name: 'Foydalanuvchini bloklash' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Bloklash sababi'), {
      target: { value: 'Qoidalarni buzdi, ogohlantirildi' },
    });
    fireEvent.click(confirm);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Yagona administratorni olib tashlab boʻlmaydi.',
    );
  });
});
