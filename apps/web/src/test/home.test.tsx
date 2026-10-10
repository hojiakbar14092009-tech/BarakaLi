import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { Logo } from '../components/Logo';
import { HomePage } from '../features/home/HomePage';

// Motion features load lazily; they are not under test, and a late import must not outlive the
// test environment.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  LazyMotion: ({ children }: { children: React.ReactNode }) => children,
}));

const fetchStub = vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));
vi.stubGlobal('fetch', fetchStub);

/** Pretends the viewport is a laptop: the desktop media query (and only it) matches. */
function useDesktop() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 1024px'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));
}

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
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchStub);
  });

  it('opens on the marketplace without catering on phones and tablets', () => {
    renderHome();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Katalog' })).toHaveAttribute('id', 'katalog');
    expect(screen.queryByRole('link', { name: 'Catering soʻrovi' })).not.toBeInTheDocument();
  });

  it('opens on the catering hero, before the marketplace, on desktop', async () => {
    useDesktop();
    renderHome();
    // The landing is a lazy chunk; under a full parallel run it can take longer than the default 1 s.
    const hero = await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(hero).toHaveTextContent(
      'Uyda tayyorlangan catering, qoʻl mehnati va dizayn, bitta joyda',
    );
    const catalog = screen.getByRole('region', { name: 'Katalog' });
    expect(hero.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: /Katalogga oʻtish/ })).toHaveAttribute(
      'href',
      '/#katalog',
    );
    expect(screen.getByRole('link', { name: 'Catering soʻrovi' })).toHaveAttribute(
      'href',
      '/#catering-sorov',
    );
  });

  it('scrolls to the catalog in place instead of navigating', async () => {
    useDesktop();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderHome();
    fireEvent.click(
      await screen.findByRole('link', { name: /Katalogga oʻtish/ }, { timeout: 5000 }),
    );
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
