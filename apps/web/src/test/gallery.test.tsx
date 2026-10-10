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
  it('offers the rotate view, not 3D, for a product without a model', () => {
    render(<ProductGallery product={base} />);
    expect(screen.queryByRole('tab', { name: /3D/ })).not.toBeInTheDocument();
    const rotate = screen.getByRole('tab', { name: 'Aylantirib koʻrish' });
    fireEvent.click(rotate);
    expect(rotate).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: /aylantirib koʻrish/ })).toBeInTheDocument();
  });

  it('has no viewer tab for a product without photos', () => {
    render(<ProductGallery product={{ ...base, images: [] }} />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rasm yoʻq' })).toBeInTheDocument();
  });

  it('without WebGL a model product gets the rotate view and no error message', () => {
    // The test DOM has no WebGL (see test/setup.ts), like an old phone.
    render(
      <ProductGallery
        product={{
          ...base,
          model: { fileUrl: '/api/files/m.glb', fileSize: 1000, posterUrl: null },
        }}
      />,
    );
    expect(screen.queryByRole('tab', { name: /3D/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Aylantirib koʻrish' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByAltText('Sopol vaza')).toBeInTheDocument();
  });
});
