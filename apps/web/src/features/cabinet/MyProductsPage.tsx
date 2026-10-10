import { Box, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ProductDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { ProductImage } from '../../components/ProductImage';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useDeleteProduct, useMyProducts, useSetStatus, useSetStock } from './api';
import { ProductForm } from './ProductForm';

function StockEditor({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const setStock = useSetStock();
  const [value, setValue] = useState(String(product.stock));
  const changed = value !== String(product.stock) && value !== '';
  return (
    <div className="flex items-end gap-2">
      <label className="flex-1 space-y-1 text-sm text-mocha">
        {t('cabinet.products.stock')}
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
          className="min-h-12 w-full rounded-field border border-wheat bg-white/70 px-3 text-base text-espresso"
        />
      </label>
      <Button
        variant="secondary"
        disabled={!changed || setStock.isPending}
        onClick={() => setStock.mutate({ id: product.id, stock: Number(value) })}
      >
        {t('cabinet.products.updateStock')}
      </Button>
    </div>
  );
}

function ProductRow({ product, onEdit }: { product: ProductDto; onEdit: () => void }) {
  const { t } = useTranslation();
  const setStatus = useSetStatus();
  const remove = useDeleteProduct();
  const [confirming, setConfirming] = useState(false);
  const currency = t('common.currency');

  return (
    <li className="space-y-3 rounded-card border border-bisque bg-white/60 p-3">
      <div className="flex gap-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-field">
          <ProductImage
            src={product.images[0]?.url}
            alt={product.title}
            categorySlug={product.categorySlug}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Link to={`/mahsulot/${product.id}`} className="flex min-h-12 items-center font-semibold">
            <span className="line-clamp-2">{product.title}</span>
          </Link>
          <p className="text-sm text-mocha">
            {t('cabinet.products.retail')}: {formatPrice(product.retailPrice, currency)}
          </p>
          {product.wholesalePrice !== null && product.wholesaleMinQty !== null && (
            <p className="text-sm text-mocha">
              {t('cabinet.products.wholesaleShort', {
                qty: product.wholesaleMinQty,
                price: formatPrice(product.wholesalePrice, currency),
              })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-bisque px-2.5 py-0.5 font-semibold">
              {t(`cabinet.products.status.${product.status}`)}
            </span>
            {product.model && (
              <span className="inline-flex items-center gap-1 text-mocha">
                <Box className="size-4" aria-hidden="true" />
                {t('cabinet.products.has3d')}
              </span>
            )}
          </div>
        </div>
      </div>

      <StockEditor key={product.stock} product={product} />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onEdit}>
          {t('cabinet.products.edit')}
        </Button>
        {product.status === 'published' ? (
          <Button
            variant="ghost"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: product.id, status: 'hidden' })}
          >
            {t('cabinet.products.hide')}
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: product.id, status: 'published' })}
          >
            {product.status === 'hidden'
              ? t('cabinet.products.show')
              : t('cabinet.products.publish')}
          </Button>
        )}
        {confirming ? (
          <Button
            variant="primary"
            disabled={remove.isPending}
            onClick={() => remove.mutate(product.id)}
          >
            {t('cabinet.products.confirmYes')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            {t('cabinet.products.delete')}
          </Button>
        )}
      </div>
      {confirming && <p className="text-sm text-mocha">{t('cabinet.products.deleteConfirm')}</p>}
      {(setStatus.isError || remove.isError) && (
        <p role="alert" className="font-medium">
          {errorMessage(setStatus.error ?? remove.error, t)}
        </p>
      )}
    </li>
  );
}

export default function MyProductsPage() {
  const { t } = useTranslation();
  const products = useMyProducts();
  const [editing, setEditing] = useState<ProductDto | 'new' | null>(null);

  if (editing) {
    return (
      <div className="pb-6">
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('cabinet.products.title')}</h1>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-5" aria-hidden="true" />
          {t('cabinet.products.add')}
        </Button>
      </div>
      {products.isPending && <LoadingState />}
      {products.isError && (
        <ErrorState
          message={errorMessage(products.error, t)}
          onRetry={() => void products.refetch()}
        />
      )}
      {products.data && products.data.length === 0 && (
        <EmptyState title={t('cabinet.products.empty')} hint={t('cabinet.products.emptyHint')} />
      )}
      {products.data && products.data.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {products.data.map((product) => (
            <ProductRow key={product.id} product={product} onEdit={() => setEditing(product)} />
          ))}
        </ul>
      )}
    </div>
  );
}
