import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDto } from '@barakali/shared';
import '../i18n';
import { ApplicationStatus } from '../features/notifications/ApplicationStatus';
import { useAuthStore } from '../stores/auth';

const base: UserDto = {
  id: 'u1',
  phone: '+998901234567',
  name: 'Usta',
  role: 'worker',
  language: 'uz',
  workerId: 'w1',
  workerName: 'Usta',
  workerStatus: 'pending',
  workerRejectReason: null,
  workerTelegramUsername: null,
};

function renderStatus(user: UserDto) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ unread: 0, items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
  useAuthStore.setState({ status: 'ready', accessToken: 'token', user });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationStatus />
    </QueryClientProvider>,
  );
}

beforeEach(() => useAuthStore.setState({ status: 'ready', user: null, accessToken: null }));
afterEach(() => vi.unstubAllGlobals());

describe('application status in the cabinet', () => {
  it('tells a pending worker that the admin is checking', () => {
    renderStatus(base);
    expect(screen.getByRole('status')).toHaveTextContent(/Ariza qabul qilindi, admin tekshiradi/);
  });

  it('shows the rejection reason to a rejected worker', () => {
    renderStatus({ ...base, workerStatus: 'rejected', workerRejectReason: 'Rasmlar yetarli emas' });
    expect(screen.getByRole('status')).toHaveTextContent(/rad etildi/);
    expect(screen.getByText('Rasmlar yetarli emas')).toBeInTheDocument();
  });

  it('confirms approval', () => {
    renderStatus({ ...base, workerStatus: 'approved' });
    expect(screen.getByRole('status')).toHaveTextContent(/tasdiqlangan/);
  });

  it('renders nothing for a customer', () => {
    const { container } = renderStatus({ ...base, workerId: null, workerStatus: null });
    expect(container).toBeEmptyDOMElement();
  });
});
