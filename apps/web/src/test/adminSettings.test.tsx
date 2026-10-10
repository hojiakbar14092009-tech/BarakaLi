import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import AdminCategoriesPage from '../features/admin/AdminCategoriesPage';
import AdminSettingsPage from '../features/admin/AdminSettingsPage';
import { WorkerStep } from '../features/auth/WorkerStep';
import { HomePage } from '../features/home/HomePage';
import { mockApi, renderApp } from './adminTestUtils';

afterEach(() => vi.unstubAllGlobals());

describe('admin settings', () => {
  it('shows the commission read-only and saves applications flag and announcements', async () => {
    const fetchMock = mockApi({
      'GET /admin/settings': () => ({
        acceptApplications: true,
        announcement: null,
        commissionPercent: 2,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      'PUT /admin/settings': () => ({
        acceptApplications: false,
        announcement: { uz: 'Bayram', ru: 'Праздник' },
        commissionPercent: 2,
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
    });
    renderApp(
      <Routes>
        <Route path="/admin/sozlamalar" element={<AdminSettingsPage />} />
      </Routes>,
      '/admin/sozlamalar',
    );
    expect(await screen.findByText('2%')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Komissiya/)).toBeNull();
    fireEvent.click(screen.getByLabelText('Yangi hunarmand arizalarini qabul qilish'));
    fireEvent.change(screen.getByLabelText('Eʼlon (oʻzbekcha)'), { target: { value: ' Bayram ' } });
    fireEvent.change(screen.getByLabelText('Eʼlon (ruscha)'), { target: { value: 'Праздник' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith('/admin/settings') && init?.method === 'PUT',
      );
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        acceptApplications: false,
        announcementUz: 'Bayram',
        announcementRu: 'Праздник',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Sozlamalar saqlandi.');
  });
});

describe('admin categories', () => {
  it('renames in both languages and disables through a named dialog', async () => {
    const fetchMock = mockApi({
      'GET /admin/categories': () => [
        {
          id: 'c1',
          slug: 'tikuvchilik',
          nameUz: 'Tikuvchilik',
          nameRu: 'Шитьё',
          isActive: true,
          productsCount: 3,
        },
      ],
      'PATCH /admin/categories/c1': () => null,
    });
    renderApp(
      <Routes>
        <Route path="/admin/xizmat-turlari" element={<AdminCategoriesPage />} />
      </Routes>,
      '/admin/xizmat-turlari',
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Tahrirlash: Tikuvchilik' }));
    fireEvent.change(screen.getByLabelText('Nomi (ruscha)'), { target: { value: 'Пошив' } });
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/admin/categories/c1'),
      );
      expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({
        nameUz: 'Tikuvchilik',
        nameRu: 'Пошив',
        isActive: true,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Oʻchirish: Tikuvchilik' }));
    const dialog = screen.getByRole('dialog', { name: 'Toifani oʻchirish' });
    expect(dialog).toHaveTextContent('Mavjud mahsulotlar saqlanadi');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Oʻchirish' }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/admin/categories/c1'),
      );
      expect(JSON.parse(String((calls.at(-1)?.[1] as RequestInit).body))).toMatchObject({
        isActive: false,
      });
    });
  });
});

describe('public settings', () => {
  it('shows the announcement on the home page in the current language', async () => {
    mockApi({
      'GET /settings': () => ({
        acceptApplications: true,
        announcement: { uz: 'Bayram kunlari', ru: 'Праздники' },
      }),
      'GET /categories': () => [],
      'GET /workers/featured': () => [],
    });
    renderApp(<HomePage />);
    expect(await screen.findByRole('note')).toHaveTextContent('Bayram kunlari');
  });

  it('replaces the worker application form with a notice when applications are closed', async () => {
    mockApi({
      'GET /settings': () => ({ acceptApplications: false, announcement: null }),
      'GET /categories': () => [
        { id: 'c1', slug: 'tikuvchilik', name: { uz: 'Tikuvchilik', ru: 'Шитьё' } },
      ],
    });
    renderApp(<WorkerStep defaultName="Dilfuza" onDone={() => undefined} />);
    // The loading indicator is also a status region, so wait for the notice text itself.
    expect(await screen.findByText(/arizalari qabul qilinmayapti/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Yoʻnalish')).toBeNull();
  });
});
