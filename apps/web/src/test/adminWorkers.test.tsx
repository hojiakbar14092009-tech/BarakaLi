import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import AdminWorkerDetailPage from '../features/admin/AdminWorkerDetailPage';
import { WorkersTab } from '../features/admin/WorkersTab';
import { emptyPage, mockApi, renderApp, sampleWorker } from './adminTestUtils';

afterEach(() => vi.unstubAllGlobals());

const approved = { ...sampleWorker, id: 'w2', displayName: 'Gulnora', status: 'approved' };

const routes = (
  <Routes>
    <Route path="/admin/hunarmandlar" element={<WorkersTab />} />
    <Route path="/admin/hunarmandlar/:id" element={<AdminWorkerDetailPage />} />
  </Routes>
);

describe('worker list', () => {
  it('offers the four filters, pending first, and searches by name or last digits', async () => {
    const fetchMock = mockApi({
      'GET /admin/workers': () => ({ ...emptyPage, items: [sampleWorker], total: 1 }),
    });
    renderApp(routes, '/admin/hunarmandlar');
    const filters = within(screen.getByRole('group', { name: 'Filtr' })).getAllByRole('button');
    expect(filters.map((b) => b.textContent)).toEqual([
      'Kutilmoqda',
      'Tasdiqlangan',
      'Rad etilgan',
      'Toʻxtatilgan',
    ]);
    expect(filters[0]).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('link', { name: 'Dilfuza' })).toHaveAttribute(
      'href',
      '/admin/hunarmandlar/w1',
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Hunarmandni qidirish' }), {
      target: { value: '2233' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Qidirish' }));
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes('q=2233') && url.includes('status=pending'))).toBe(
        true,
      );
    });
  });

  it('suspends an approved worker only with a reason, through a named dialog', async () => {
    const fetchMock = mockApi({
      'GET /admin/workers': () => ({ ...emptyPage, items: [approved], total: 1 }),
      'POST /admin/workers/w2/suspend': () => null,
    });
    renderApp(routes, '/admin/hunarmandlar');
    const open = await screen.findByRole('button', { name: 'Toʻxtatish: Gulnora' });
    expect(screen.queryByRole('button', { name: /^Tasdiqlash: Gulnora$/ })).toBeNull();
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Hunarmandni toʻxtatish' });
    expect(dialog).toHaveTextContent('Gulnora');
    const confirm = within(dialog).getByRole('button', { name: 'Hunarmandni toʻxtatish' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Toʻxtatish sababi'), {
      target: { value: 'Shikoyatlar koʻp' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/admin/workers/w2/suspend'),
      );
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        reason: 'Shikoyatlar koʻp',
      });
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(open).toHaveFocus();
  });
});

describe('worker detail', () => {
  it('shows the profile, Telegram handle, products link and reviewer', async () => {
    mockApi({
      'GET /admin/workers/w2': () => ({
        ...approved,
        telegramUsername: 'gulnora_usta',
        bio: 'Milliy liboslar',
        productsCount: 3,
        reviewedAt: '2026-02-01T05:00:00.000Z',
        reviewedByName: 'Hojiakbar',
      }),
    });
    renderApp(routes, '/admin/hunarmandlar/w2');
    expect(await screen.findByRole('heading', { level: 1, name: /Gulnora/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@gulnora_usta' })).toHaveAttribute(
      'href',
      'https://t.me/gulnora_usta',
    );
    expect(screen.getByRole('link', { name: '3 ta mahsulot' })).toHaveAttribute(
      'href',
      '/admin/mahsulotlar?hunarmand=w2',
    );
    expect(screen.getByText(/Hojiakbar/)).toBeInTheDocument();
    expect(screen.getByText('Milliy liboslar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toʻxtatish: Gulnora' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profilni ochish' })).toHaveAttribute(
      'href',
      '/hunarmand/w2',
    );
  });
});
