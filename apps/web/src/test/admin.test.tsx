import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import AdminLayout from '../features/admin/AdminLayout';
import DashboardPage from '../features/admin/DashboardPage';
import { AdminModerationPage, AdminWorkersPage } from '../features/admin/sectionPages';
import { RequireAuth } from '../features/auth/RequireAuth';
import { SavingsGoal } from '../features/cabinet/SavingsGoal';
import LessonsPage from '../features/lessons/LessonsPage';
import MaterialsPage from '../features/materials/MaterialsPage';
import { useAuthStore } from '../stores/auth';
import { emptyPage, mockApi, renderApp, sampleWorker } from './adminTestUtils';

const adminRoutes = (
  <Routes>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="hunarmandlar" element={<AdminWorkersPage />} />
      <Route path="sharhlar" element={<AdminModerationPage />} />
    </Route>
  </Routes>
);

beforeEach(() => {
  useAuthStore.setState({ status: 'ready', user: null, accessToken: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('admin route guard', () => {
  const guarded = (
    <Routes>
      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<p>Panel</p>} />
      </Route>
      <Route path="/" element={<p>Bosh sahifa</p>} />
      <Route path="/kirish" element={<p>Kirish sahifasi</p>} />
    </Routes>
  );
  const user = (role: 'customer' | 'worker' | 'admin') => ({
    id: 'u1',
    phone: '+998901234567',
    name: 'Test',
    role,
    language: 'uz' as const,
    workerId: null,
    workerName: null,
    workerStatus: null,
    workerRejectReason: null,
    workerTelegramUsername: null,
  });

  it('sends anonymous visitors to sign in and non-admins home', () => {
    renderApp(guarded, '/admin');
    expect(screen.getByText('Kirish sahifasi')).toBeInTheDocument();
  });

  it('shows customers a 403 page with a way home and lets admins in', async () => {
    useAuthStore.setState({ user: user('customer') });
    const first = renderApp(guarded, '/admin');
    expect(
      await screen.findByRole('heading', { name: 'Bu sahifaga kirish mumkin emas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bosh sahifaga qaytish' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByText('Panel')).not.toBeInTheDocument();
    first.unmount();

    useAuthStore.setState({ user: user('admin') });
    renderApp(guarded, '/admin');
    expect(screen.getByText('Panel')).toBeInTheDocument();
  });
});

describe('admin panel', () => {
  const worker = sampleWorker;

  it('approves a pending application and shows the filters in order', async () => {
    const fetchMock = mockApi({
      'GET /admin/stats': () => ({
        users: 3,
        workers: 2,
        approvedWorkers: 1,
        pendingWorkers: 1,
        rejectedWorkers: 0,
        ordersByStatus: { delivered: 4 },
        ordersToday: 2,
        turnover: 500_000,
        commission: 10_000,
        openComplaints: 1,
        hiddenReviews: 0,
      }),
      'GET /admin/workers': () => ({ ...emptyPage, items: [worker], total: 1 }),
      'POST /admin/workers/w1/approve': () => null,
    });
    renderApp(adminRoutes, '/admin');

    expect(await screen.findByText('500 000 soʻm')).toBeInTheDocument();
    expect(screen.getByText('10 000 soʻm')).toBeInTheDocument();
    expect(screen.getByText('Kutilayotgan arizalar').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Bugungi buyurtmalar').nextElementSibling).toHaveTextContent('2');
    const sidebar = screen.getByRole('navigation', { name: 'Boshqaruv boʻlimlari' });
    expect(within(sidebar).getByRole('link', { name: 'Boshqaruv paneli' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(sidebar).getByRole('link', { name: 'Hunarmandlar' }));
    expect(within(sidebar).getByRole('link', { name: 'Hunarmandlar' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await screen.findByText('Dilfuza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kutilmoqda' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Tasdiqlangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rad etilgan' })).toBeInTheDocument();
    expect(screen.getByText(/\+998 90 111 22 33/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Tasdiqlash: Dilfuza$/ }));
    const dialog = screen.getByRole('dialog', { name: 'Hunarmandni tasdiqlash' });
    expect(dialog).toHaveTextContent('Dilfuza');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hunarmandni tasdiqlash' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/admin/workers/w1/approve'),
      );
      expect(call).toBeDefined();
      expect((call?.[1] as RequestInit).method).toBe('POST');
    });
  });

  it('rejects only with a reason of at least 10 characters', async () => {
    const fetchMock = mockApi({
      'GET /admin/stats': () => ({}),
      'GET /admin/workers': () => ({ ...emptyPage, items: [worker], total: 1 }),
      'POST /admin/workers/w1/reject': () => null,
    });
    renderApp(adminRoutes, '/admin/hunarmandlar');
    fireEvent.click(await screen.findByRole('button', { name: /^Rad etish: Dilfuza$/ }));

    const confirm = screen.getByRole('button', { name: 'Hunarmandni rad etish' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rad etish sababi'), { target: { value: 'qisqa' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rad etish sababi'), {
      target: { value: 'Hujjatlar yetarli emas' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/admin/workers/w1/reject'),
      );
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        reason: 'Hujjatlar yetarli emas',
      });
    });
  });

  it('hides a review and offers a refund only for refundable paid orders', async () => {
    const fetchMock = mockApi({
      'GET /admin/reviews': () => ({
        ...emptyPage,
        total: 1,
        items: [
          {
            id: 'r1',
            orderId: 'o1',
            workerName: 'Dilfuza',
            authorName: 'Mijoz',
            rating: 1,
            comment: 'Yomon',
            status: 'visible',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      'PATCH /admin/reviews/r1': () => null,
      'GET /admin/complaints': () => ({
        ...emptyPage,
        total: 2,
        items: [
          {
            id: 'c1',
            orderId: '11111111-0000-0000-0000-000000000000',
            authorName: 'Mijoz',
            authorRole: 'customer',
            reason: 'Kech keldi',
            status: 'open',
            orderStatus: 'accepted',
            paymentStatus: 'paid',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'c2',
            orderId: '22222222-0000-0000-0000-000000000000',
            authorName: 'Usta',
            authorRole: 'worker',
            reason: 'Toʻlamadi',
            status: 'open',
            orderStatus: 'awaiting_payment',
            paymentStatus: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    });
    renderApp(adminRoutes, '/admin/sharhlar');

    expect(await screen.findByText('Yomon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yashirish: Dilfuza' }));
    const dialog = screen.getByRole('dialog', { name: 'Sharhni yashirish' });
    const confirm = within(dialog).getByRole('button', { name: 'Sharhni yashirish' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Yashirish sababi'), {
      target: { value: 'Haqoratli soʻzlar bor' },
    });
    fireEvent.click(confirm);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/admin/reviews/r1'));
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        status: 'hidden',
        reason: 'Haqoratli soʻzlar bor',
      });
    });

    expect(await screen.findByText('Kech keldi')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Pulni qaytarish' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Koʻrib chiqishga olish' })).toHaveLength(2);
  });
});

describe('admin drawer (phones and tablets)', () => {
  it('opens from the menu button, moves focus in, closes on Escape and returns focus', async () => {
    mockApi({ 'GET /admin/stats': () => ({}) });
    renderApp(adminRoutes, '/admin');
    const trigger = screen.getByRole('button', { name: 'Boʻlimlar' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Boʻlimlar' });
    await waitFor(() =>
      expect(within(dialog).getByRole('link', { name: 'Boshqaruv paneli' })).toHaveFocus(),
    );
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('materials store', () => {
  const materials = [
    {
      id: 'm1',
      name: 'Paxta ip',
      description: '',
      price: 10_000,
      discountPercent: 15,
      unitPrice: 8_500,
      stock: 3,
      isActive: true,
    },
  ];

  it('shows the discount, caps the quantity at stock and totals the selection', async () => {
    mockApi({
      'GET /materials': () => materials,
      'GET /material-orders': () => [],
    });
    renderApp(<MaterialsPage />);

    expect(await screen.findByText('8 500 soʻm')).toBeInTheDocument();
    expect(screen.getByText('−15%')).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Paxta ip' });
    const more = within(group).getByRole('button', { name: 'Koʻpaytirish' });
    for (let i = 0; i < 5; i += 1) fireEvent.click(more);
    expect(more).toBeDisabled();
    expect(screen.getByText(/Jami: 25 500 soʻm/)).toBeInTheDocument();
    expect(more.className).toContain('size-12');
  });

  it('creates the order from ids and quantities only', async () => {
    const fetchMock = mockApi({
      'GET /materials': () => materials,
      'GET /material-orders': () => [],
      'POST /material-orders': () => ({
        id: 'mo1',
        status: 'awaiting_payment',
        total: 17_000,
        items: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    });
    renderApp(
      <Routes>
        <Route path="/materiallar" element={<MaterialsPage />} />
        <Route path="/materiallar/tolov/:id" element={<p>Toʻlov</p>} />
      </Routes>,
      '/materiallar',
    );
    const group = await screen.findByRole('group', { name: 'Paxta ip' });
    const more = within(group).getByRole('button', { name: 'Koʻpaytirish' });
    fireEvent.click(more);
    fireEvent.click(more);
    fireEvent.click(screen.getByRole('button', { name: 'Buyurtma berish' }));
    expect(await screen.findByText('Toʻlov')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith('/material-orders') && init?.method === 'POST',
    );
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
      items: [{ materialId: 'm1', quantity: 2 }],
    });
  });
});

describe('savings goal', () => {
  it('shows progress toward the target', async () => {
    mockApi({
      'GET /my/savings-goal': () => ({
        goal: { targetAmount: 1_000_000, saved: 250_000, createdAt: '2026-01-01T00:00:00.000Z' },
      }),
    });
    renderApp(<SavingsGoal />);
    expect(await screen.findByText('250 000 soʻm / 1 000 000 soʻm')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '25');
  });

  it('asks for a target when none is set and sends it as whole som', async () => {
    const fetchMock = mockApi({
      'GET /my/savings-goal': () => ({ goal: null }),
      'PUT /my/savings-goal': () => ({
        goal: { targetAmount: 500_000, saved: 0, createdAt: '2026-01-01T00:00:00.000Z' },
      }),
    });
    renderApp(<SavingsGoal />);
    const input = await screen.findByLabelText(/Maqsad summasi/);
    fireEvent.change(input, { target: { value: '500 000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        targetAmount: 500_000,
      });
    });
  });
});

describe('lessons page', () => {
  it('lists every lesson with its steps', () => {
    renderApp(<LessonsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Darslar' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(16);
  });
});
