import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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

describe('home page', () => {
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
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('renders Baraka in Espresso Oak and Li in Mocha', () => {
    render(<Logo />);
    expect(screen.getByText('Baraka')).toHaveClass('text-espresso');
    expect(screen.getByText('Li')).toHaveClass('text-mocha');
  });
});
