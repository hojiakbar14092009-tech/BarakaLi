import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { resolveLinePrice, type FulfillmentType, type ProductDto } from '@barakali/shared';
import { Button, buttonClasses } from '../../components/Button';
import { TextAreaField } from '../../components/Field';
import { ProductImage } from '../../components/ProductImage';
import { EmptyState, LoadingState } from '../../components/StateViews';
import { apiRequest } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { QuantityPicker } from '../products/QuantityPicker';
import { useCreateOrders } from '../orders/api';

export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { items, setQuantity, remove, clear } = useCartStore();
  const create = useCreateOrders();
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('pickup');
  const [address, setAddress] = useState('');
  const currency = t('common.currency');

  const queries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => apiRequest<ProductDto>(`/products/${item.productId}`),
      retry: false,
    })),
  });

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('cart.title')}</h1>
        <EmptyState
          title={t('cart.empty')}
          hint={t('cart.emptyHint')}
          action={
            <Link to="/xizmatlar/barchasi" className={buttonClasses('primary')}>
              {t('cart.browse')}
            </Link>
          }
        />
      </div>
    );
  }
  if (queries.some((query) => query.isPending)) return <LoadingState />;

  const lines = items.map((item, index) => ({ item, product: queries[index]?.data }));
  const valid = lines.flatMap(({ item, product }) =>
    product && product.status === 'published' && product.stock > 0 ? [{ item, product }] : [],
  );
  const priced = valid.map(({ item, product }) => ({
    product,
    quantity: item.quantity,
    price: resolveLinePrice(product, item.quantity),
  }));
  const total = priced.reduce((sum, line) => sum + line.price.lineTotal, 0);
  const workerCount = new Set(priced.map((line) => line.product.worker.id)).size;
  const hasUnavailable = valid.length !== lines.length;

  const checkout = () => {
    create.mutate(
      {
        items: valid.map(({ item }) => ({ productId: item.productId, quantity: item.quantity })),
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? address : undefined,
      },
      {
        onSuccess: (orders) => {
          clear();
          const first = orders[0];
          if (first) navigate(`/tolov/${first.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-3xl font-bold">{t('cart.title')}</h1>
      <ul className="space-y-3">
        {lines.map(({ item, product }) => (
          <li
            key={item.productId}
            className="flex gap-3 rounded-card border border-bisque bg-white/60 p-3"
          >
            <div className="size-24 shrink-0 overflow-hidden rounded-field">
              <ProductImage src={product?.images[0]?.url} alt={product?.title ?? ''} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {product ? (
                <>
                  <Link to={`/mahsulot/${product.id}`} className="line-clamp-2 font-semibold">
                    {product.title}
                  </Link>
                  <p className="text-sm text-mocha">
                    {t('cart.seller', { name: product.worker.displayName })}
                  </p>
                  {product.stock > 0 && product.status === 'published' ? (
                    <>
                      <QuantityPicker
                        value={item.quantity}
                        max={product.stock}
                        onChange={(value) => setQuantity(item.productId, value)}
                      />
                      <LinePrice product={product} quantity={item.quantity} currency={currency} />
                    </>
                  ) : (
                    <p className="font-medium">{t('cart.unavailable')}</p>
                  )}
                </>
              ) : (
                <p className="font-medium">{t('cart.unavailable')}</p>
              )}
            </div>
            <button
              type="button"
              aria-label={t('cart.remove')}
              onClick={() => remove(item.productId)}
              className="grid size-12 shrink-0 place-items-center rounded-field text-mocha hover:bg-bisque/60"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <fieldset className="space-y-3 rounded-card border border-bisque p-4">
        <legend className="px-1 font-semibold">{t('cart.fulfillment')}</legend>
        {(['pickup', 'delivery'] as const).map((value) => (
          <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="fulfillment"
              value={value}
              checked={fulfillment === value}
              onChange={() => setFulfillment(value)}
              className="size-5 accent-mocha"
            />
            <span>{t(`cart.${value}`)}</span>
          </label>
        ))}
        {fulfillment === 'delivery' && (
          <TextAreaField
            label={t('cart.address')}
            placeholder={t('cart.addressPlaceholder')}
            rows={2}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            hint={t('cart.deliveryNote')}
          />
        )}
      </fieldset>

      {workerCount > 1 && (
        <p className="rounded-field bg-bisque px-4 py-3">{t('cart.multiNote')}</p>
      )}
      {create.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(create.error, t)}
        </p>
      )}

      <div className="sticky bottom-20 space-y-3 rounded-card border border-bisque bg-sugar p-4 shadow-soft sm:bottom-4">
        <p className="flex items-center justify-between text-xl font-bold">
          <span>{t('cart.total')}</span>
          <span>{formatPrice(total, currency)}</span>
        </p>
        {user ? (
          <Button
            size="lg"
            className="w-full"
            disabled={
              create.isPending ||
              hasUnavailable ||
              valid.length === 0 ||
              (fulfillment === 'delivery' && address.trim().length === 0)
            }
            onClick={checkout}
          >
            {create.isPending ? t('cart.creating') : t('cart.checkout')}
          </Button>
        ) : (
          <Link to="/kirish?next=%2Fsavat" className={buttonClasses('primary', 'lg', 'w-full')}>
            {t('cart.signInToOrder')}
          </Link>
        )}
      </div>
    </div>
  );
}

function LinePrice({
  product,
  quantity,
  currency,
}: {
  product: ProductDto;
  quantity: number;
  currency: string;
}) {
  const { t } = useTranslation();
  const price = resolveLinePrice(product, quantity);
  return (
    <p className="text-sm">
      {formatPrice(price.unitPrice, currency)} × {quantity} ={' '}
      <span className="font-bold">{formatPrice(price.lineTotal, currency)}</span>
      {price.priceType === 'wholesale' && (
        <span className="ml-2 rounded-full bg-pistachio px-2 py-0.5 font-medium text-espresso">
          {t('cart.wholesaleApplied')}
        </span>
      )}
    </p>
  );
}
