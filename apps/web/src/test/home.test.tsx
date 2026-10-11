import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { Logo } from '../components/Logo';
import { HomePage } from '../features/home/HomePage';

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

// The desktop opening is a lazy chunk; loading it up front keeps the test independent of how long
// the first on-the-fly compile takes when other suites run in parallel.
const CHUNK_COMPILE_TIMEOUT_MS = 60_000;
beforeAll(async () => {
  await import('../features/home/HomeLanding');
}, CHUNK_COMPILE_TIMEOUT_MS);
// Restored even when a test fails, so a desktop stub never leaks into the phone layout tests.
afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('home page', () => {
  it('on desktop opens with the hero, then the story, then the catalog', async () => {
    const query = (matches: boolean) => ({
      matches,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      // framer-motion still uses the legacy listener API.
      addListener: () => undefined,
      removeListener: () => undefined,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (q: string) => query(q === '(min-width: 1024px)'),
    });
    renderHome();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Uyda tayyorlangan pishiriq, qoʻl mehnati va dizayn, bitta joyda',
    );
    expect(screen.getByRole('link', { name: /Katalogga oʻtish/ })).toHaveAttribute(
      'href',
      '/#katalog',
    );
    expect(screen.getByRole('heading', { name: /Nega aynan/ })).toBeInTheDocument();
    expect(screen.getAllByText('Muammo')).toHaveLength(2);
    expect(screen.getByText('Yechim')).toBeInTheDocument();
    const hero = screen.getByRole('heading', { level: 1 }).closest('section');
    const catalog = document.getElementById('katalog');
    expect(catalog).not.toBeNull();
    expect(
      hero && catalog && hero.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('on phones and tablets keeps the plain catalog page without the hero', () => {
    renderHome();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Nega aynan/ })).not.toBeInTheDocument();
    expect(screen.getByText('Hunarmand boʻling')).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Qanday ishlaydi' })).toBeInTheDocument();
  });

  it('has no catering content', () => {
    renderHome();
    expect(screen.queryByText(/catering/i)).not.toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('renders Baraka in Espresso Oak and Li in Mocha', () => {
    render(<Logo />);
    expect(screen.getByText('Baraka')).toHaveClass('text-espresso');
    expect(screen.getByText('Li')).toHaveClass('text-mocha');
  });
});
