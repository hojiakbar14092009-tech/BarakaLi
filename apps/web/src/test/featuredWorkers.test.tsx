import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { FeaturedWorkers } from '../features/home/FeaturedWorkers';
import { mockApi, renderApp } from './adminTestUtils';

afterEach(() => vi.unstubAllGlobals());

describe('featured workers', () => {
  it('shows the card without a "verified" badge: every featured worker is admin-approved', async () => {
    mockApi({
      'GET /workers/featured': () => [
        {
          id: 'w1',
          displayName: 'Dilfuza Karimova',
          bio: null,
          avatarUrl: null,
          categorySlug: 'tikuvchilik',
          rating: 4.9,
          reviewsCount: 38,
          isVerified: true,
          minPrice: 95_000,
          productsCount: 2,
        },
      ],
    });
    renderApp(<FeaturedWorkers />);
    expect(await screen.findByText('Dilfuza Karimova')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buyurtma berish' })).toHaveAttribute(
      'href',
      '/hunarmand/w1',
    );
    expect(screen.queryByText('Tasdiqlangan')).not.toBeInTheDocument();
  });
});
