import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

type Handler = (init: RequestInit | undefined) => unknown;

/** Stubs fetch with `METHOD /path` handlers; unknown routes answer 404 like the API would. */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^\/api/, '');
    const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
    const handler = routes[key];
    const body = handler ? handler(init) : { error: { code: 'NOT_FOUND' } };
    const status = handler ? (init?.method === 'POST' ? 201 : 200) : 404;
    return Promise.resolve(
      body === null
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(ui: React.ReactElement, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

export const emptyPage = { items: [], page: 1, pageSize: 20, total: 0 };

export const sampleWorker = {
  id: 'w1',
  userId: 'u-w1',
  displayName: 'Dilfuza',
  phone: '+998901112233',
  telegramUsername: null,
  bio: null,
  categorySlug: 'tikuvchilik',
  status: 'pending',
  rejectReason: null,
  reviewedAt: null,
  reviewedByName: null,
  productsCount: 0,
  rating: 0,
  reviewsCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};
