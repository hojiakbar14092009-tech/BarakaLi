import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tashkentDay, tashkentToDate } from '@barakali/shared';
import '../i18n';
import CalendarPage from '../features/calendar/CalendarPage';
import NewServiceOrderPage from '../features/orders/NewServiceOrderPage';

const WORKER = '6f1b4f0e-79a1-4a5b-8f0e-3f9d2f3f6a11';
const HOUR_MS = 60 * 60 * 1000;
const day = tashkentDay(new Date(Date.now() + 3 * 24 * HOUR_MS));
const windowStart = tashkentToDate(day, '10:00');
const iso = (offsetHours: number) =>
  new Date(windowStart.getTime() + offsetHours * HOUR_MS).toISOString();

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockApi(extra: Record<string, () => Promise<Response>> = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    for (const [fragment, handler] of Object.entries(extra)) {
      if (url.includes(fragment)) return handler();
    }
    if (url.endsWith(`/workers/${WORKER}/availability`)) {
      return jsonResponse({
        windows: [{ id: 'a1', startTime: iso(0), endTime: iso(4) }],
        booked: [{ startTime: iso(2), endTime: iso(3) }],
      });
    }
    if (url.endsWith(`/workers/${WORKER}`)) {
      return jsonResponse({
        id: WORKER,
        displayName: 'Dilfuza',
        bio: null,
        categorySlug: 'tikuvchilik',
        avatarUrl: null,
        rating: 5,
        reviewsCount: 1,
        isVerified: true,
        hourlyRate: 40_000,
        minPrice: null,
        productsCount: 0,
      });
    }
    return jsonResponse({ error: { code: 'NOT_FOUND' } }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(ui: React.ReactElement, path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/buyurtma/yangi" element={ui} />
          <Route path="/hunarmand/kalendar" element={ui} />
          <Route path="/tolov/:id" element={<p>Toʻlov sahifasi</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('new service order page', () => {
  it('offers only hours that are free and sends the chosen slot', async () => {
    const fetchMock = mockApi({
      '/orders/service': () => jsonResponse({ id: 'order-9' }, 201),
    });
    renderPage(<NewServiceOrderPage />, `/buyurtma/yangi?hunarmand=${WORKER}`);

    expect(await screen.findByRole('button', { name: '10:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11:00' })).toBeInTheDocument();
    // 12:00 is booked; 13:00 is free again.
    expect(screen.queryByRole('button', { name: '12:00' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '13:00' })).toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { pressed: false })) {
      expect(button.className).toContain('min-h-12');
    }

    const submit = screen.getByRole('button', { name: /Buyurtma berish va toʻlash/ });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '11:00' }));
    fireEvent.change(screen.getByLabelText(/Nima kerak/), { target: { value: 'Koʻylak tikish' } });
    expect(submit).toBeEnabled();
    expect(screen.getByText(/40 000 soʻm/, { selector: 'dd' })).toBeInTheDocument();
    fireEvent.click(submit);

    expect(await screen.findByText('Toʻlov sahifasi')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/orders/service'));
    const body = JSON.parse(String((call?.[1] as RequestInit).body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      workerId: WORKER,
      hours: 1,
      startTime: iso(1),
      description: 'Koʻylak tikish',
    });
  });

  it('shows a translated message when the slot was taken meanwhile', async () => {
    mockApi({
      '/orders/service': () => jsonResponse({ error: { code: 'ORDER_SLOT_TAKEN' } }, 409),
    });
    renderPage(<NewServiceOrderPage />, `/buyurtma/yangi?hunarmand=${WORKER}`);
    fireEvent.click(await screen.findByRole('button', { name: '10:00' }));
    fireEvent.change(screen.getByLabelText(/Nima kerak/), { target: { value: 'Koʻylak' } });
    fireEvent.click(screen.getByRole('button', { name: /Buyurtma berish va toʻlash/ }));
    expect(await screen.findByText(/Bu vaqt band/)).toBeInTheDocument();
  });

  it('explains when no slot fits the chosen duration', async () => {
    mockApi();
    renderPage(<NewServiceOrderPage />, `/buyurtma/yangi?hunarmand=${WORKER}`);
    await screen.findByRole('button', { name: '10:00' });
    fireEvent.change(screen.getByLabelText(/Ish davomiyligi/), { target: { value: '5' } });
    expect(await screen.findByText(/boʻsh vaqt yoʻq/)).toBeInTheDocument();
  });
});

describe('worker calendar page', () => {
  it('fills the hours from a quick button and posts a Tashkent-time window', async () => {
    const fetchMock = mockApi({
      '/my/availability': () => jsonResponse({ windows: [], booked: [], hourlyRate: null }),
    });
    renderPage(<CalendarPage />, '/hunarmand/kalendar');

    fireEvent.click(await screen.findByRole('button', { name: 'Kechqurun' }));
    fireEvent.change(screen.getByLabelText('Kun'), { target: { value: day } });
    expect(screen.getByLabelText('Dan')).toHaveValue('17');
    expect(screen.getByLabelText('Gacha')).toHaveValue('21');

    fetchMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Vaqtni qoʻshish' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/my/availability');
    expect(JSON.parse(String(init.body))).toEqual({
      startTime: tashkentToDate(day, '17:00').toISOString(),
      endTime: tashkentToDate(day, '21:00').toISOString(),
    });
  });
});
