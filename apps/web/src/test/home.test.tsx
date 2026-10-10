import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import '../i18n';
import { Logo } from '../components/Logo';
import { HomePage } from '../features/home/HomePage';

// Motion features load lazily; they are not under test, and a late import must not outlive the
// test environment.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  LazyMotion: ({ children }: { children: React.ReactNode }) => children,
}));

vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))),
);

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('home page', () => {
  it('opens on the catering hero, before the marketplace', () => {
    renderHome();
    const hero = screen.getByRole('heading', { level: 1 });
    expect(hero).toHaveTextContent(
      'Uyda tayyorlangan catering, qoʻl mehnati va dizayn, bitta joyda',
    );
    const catalog = screen.getByRole('region', { name: 'Katalog' });
    expect(hero.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(catalog).toHaveAttribute('id', 'katalog');
    expect(screen.getByRole('link', { name: /Katalogga oʻtish/ })).toHaveAttribute(
      'href',
      '/#katalog',
    );
    expect(screen.getByRole('link', { name: 'Catering soʻrovi' })).toHaveAttribute(
      'href',
      '/#catering-sorov',
    );
  });

  it('scrolls to the catalog in place instead of navigating', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderHome();
    fireEvent.click(screen.getByRole('link', { name: /Katalogga oʻtish/ }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('shows search, the four categories and the become-worker call to action', async () => {
    renderHome();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tikuvchilik/ })).toHaveAttribute(
      'href',
      '/xizmatlar/tikuvchilik',
    );
    expect(screen.getAllByRole('link', { name: /Hunarmand boʻlish/ }).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Hunarmandlar tez orada/)).toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('renders Baraka in Espresso Oak and Li in Mocha', () => {
    render(<Logo />);
    expect(screen.getByText('Baraka')).toHaveClass('text-espresso');
    expect(screen.getByText('Li')).toHaveClass('text-mocha');
  });
});
