import { BadgeCheck, Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { ProductCard } from '../catalog/ProductCard';
import { useProducts, useWorker } from '../catalog/api';

export default function WorkerPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const worker = useWorker(id);
  const products = useProducts({ workerId: id, page });

  if (worker.isPending) return <LoadingState />;
  if (worker.isError || !worker.data) {
    return <ErrorState message={t('catalog.workerNotFound')} />;
  }
  const data = worker.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-card bg-bisque/60 p-5 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="grid size-20 shrink-0 place-items-center rounded-full bg-mocha text-3xl font-bold text-sugar"
        >
          {data.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{data.displayName}</h1>
          <p className="text-mocha">{t(`categories.${data.categorySlug}`)}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-mocha">
              <Star className="size-4" aria-hidden="true" />
              {data.rating.toFixed(1)} ({data.reviewsCount})
            </span>
            {data.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pistachio px-2.5 py-0.5 font-medium text-espresso">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {t('home.verified')}
              </span>
            )}
            <span className="text-mocha">
              {t('catalog.productsCount', { count: data.productsCount })}
            </span>
          </div>
          {data.bio && <p className="max-w-2xl pt-1">{data.bio}</p>}
        </div>
      </header>

      <section aria-labelledby="worker-products" className="space-y-3">
        <h2 id="worker-products" className="text-xl font-bold">
          {t('catalog.workerProducts')}
        </h2>
        {products.isPending && <LoadingState />}
        {products.isError && <ErrorState message={errorMessage(products.error, t)} />}
        {products.data && products.data.items.length === 0 && (
          <EmptyState title={t('catalog.empty')} />
        )}
        {products.data && products.data.items.length > 0 && (
          <>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
            <Pagination
              page={products.data.page}
              pageSize={products.data.pageSize}
              total={products.data.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
