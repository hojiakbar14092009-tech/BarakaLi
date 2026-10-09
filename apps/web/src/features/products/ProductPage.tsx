import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { resolveLinePrice } from '@barakali/shared';
import { Button, buttonClasses } from '../../components/Button';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { useProduct } from '../catalog/api';
import { PriceBlock } from './PriceBlock';
import { ProductGallery } from './ProductGallery';
import { QuantityPicker } from './QuantityPicker';

export default function ProductPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const product = useProduct(id);
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.add);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (product.isPending) return <LoadingState />;
  if (product.isError || !product.data) {
    return (
      <ErrorState
        message={product.error ? errorMessage(product.error, t) : t('product.notFound')}
      />
    );
  }

  const data = product.data;
  const currency = t('common.currency');
  const line = resolveLinePrice(data, quantity);
  const isOwn = user?.workerId === data.worker.id;
  const available = data.stock > 0 && data.status === 'published';

  return (
    <article className="grid gap-6 pb-6 md:grid-cols-2 md:gap-10">
      <ProductGallery key={data.id} product={data} />

      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">{data.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-mocha">
            {t('product.byWorker')}:{' '}
            <Link
              to={`/hunarmand/${data.worker.id}`}
              className="font-semibold text-espresso underline"
            >
              {data.worker.displayName}
            </Link>
            {data.worker.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pistachio px-2 py-0.5 text-sm font-medium text-espresso">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {t('home.verified')}
              </span>
            )}
          </p>
        </header>

        <PriceBlock product={data} size="lg" />

        {data.status !== 'published' && (
          <p role="status" className="rounded-field bg-bisque px-4 py-3">
            {t('product.draftNotice')}
          </p>
        )}
        {data.description && (
          <p className="whitespace-pre-line text-espresso">{data.description}</p>
        )}

        <p className={data.stock > 0 ? 'text-mocha' : 'font-semibold'}>
          {data.stock > 0 ? t('product.stock', { count: data.stock }) : t('product.outOfStock')}
        </p>

        {available && !isOwn && (
          <section className="space-y-4 rounded-card border border-bisque bg-white/60 p-4">
            <div className="space-y-2">
              <p className="font-medium">{t('product.quantity')}</p>
              <QuantityPicker value={quantity} max={data.stock} onChange={setQuantity} />
            </div>
            <div className="space-y-1">
              <p className="text-mocha">
                {t('product.unitPrice', { price: formatPrice(line.unitPrice, currency) })}
                {line.priceType === 'wholesale' && (
                  <span className="ml-2 rounded-full bg-pistachio px-2 py-0.5 text-sm font-medium text-espresso">
                    {t('product.wholesaleApplied')}
                  </span>
                )}
              </p>
              <p className="text-2xl font-bold" aria-live="polite">
                {t('product.total')}: {formatPrice(line.lineTotal, currency)}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                addToCart(data.id, quantity);
                setAdded(true);
              }}
            >
              {t('product.addToCart')}
            </Button>
            {added && (
              <p
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 font-medium"
              >
                {t('product.added')}
                <Link to="/savat" className={buttonClasses('secondary')}>
                  {t('product.goToCart')}
                </Link>
              </p>
            )}
          </section>
        )}
        {isOwn && <p className="rounded-field bg-bisque px-4 py-3">{t('product.ownProduct')}</p>}
      </div>
    </article>
  );
}
