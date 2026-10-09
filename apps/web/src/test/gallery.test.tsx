import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProductDto } from '@barakali/shared';
import '../i18n';
import { ProductGallery } from '../features/products/ProductGallery';

const base: ProductDto = {
  id: 'p1',
  worker: { id: 'w1', displayName: 'Usta', isVerified: false },
  categoryId: 'c1',
  categorySlug: 'qol-mehnati',
  title: 'Sopol vaza',
  description: '',
  retailPrice: 100_000,
  wholesalePrice: null,
  wholesaleMinQty: null,
  stock: 3,
  status: 'published',
  images: [
    { id: 'i1', url: '/api/files/a.webp', position: 0 },
    { id: 'i2', url: '/api/files/b.webp', position: 1 },
  ],
  model: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ProductGallery', () => {
  it('has no 3D tab for a product without a model', () => {
    render(<ProductGallery product={base} />);
    expect(screen.queryByRole('tab', { name: /3D/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });

  it('shows a 3D tab next to the photos when a model exists', () => {
    render(
      <ProductGallery
        product={{
          ...base,
          model: { fileUrl: '/api/files/m.glb', fileSize: 1000, posterUrl: null },
        }}
      />,
    );
    expect(screen.getByRole('tab', { name: /3D/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Rasmlar/ })).toBeInTheDocument();
  });

  it('falls back to the photos with a message when WebGL is unavailable', async () => {
    render(
      <ProductGallery
        product={{
          ...base,
          model: { fileUrl: '/api/files/m.glb', fileSize: 1000, posterUrl: null },
        }}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /3D/ }));
    expect(
      await screen.findByText(/3D koʻrinishni qoʻllamaydi/, {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /3D/ })).not.toBeInTheDocument();
    expect(screen.getByAltText('Sopol vaza')).toBeInTheDocument();
  });
});
