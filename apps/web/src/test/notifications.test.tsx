import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { NavBar } from '../layout/NavBar';
import { useAuthStore } from '../stores/auth';

function mockNotifications(unread: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ unread, items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
}

function renderNav() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({
    status: 'ready',
    accessToken: 'token',
    user: {
      id: 'u1',
      phone: '+998901234567',
      name: 'Usta',
      role: 'worker',
      language: 'uz',
      workerId: 'w1',
      workerName: 'Usta',
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('new order badge', () => {
  it('shows the unread count on the orders entry for a worker', async () => {
    mockNotifications(3);
    renderNav();
    const badge = await screen.findByLabelText('3 ta yangi buyurtma');
    expect(badge).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Buyurtmalar/ })).toContainElement(badge);
  });

  it('shows nothing when there is nothing new', async () => {
    mockNotifications(0);
    renderNav();
    expect(await screen.findByRole('link', { name: /Buyurtmalar/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/yangi buyurtma/)).not.toBeInTheDocument();
  });
});
