import { BadgeCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { WorkerSummaryDto } from '@barakali/shared';
import { buttonClasses } from '../../components/Button';
import { formatPrice } from '../../lib/format';
import { useFeaturedWorkers } from '../workers/api';

function WorkerCard({ worker }: { worker: WorkerSummaryDto }) {
  const { t } = useTranslation();
  return (
    <li className="flex min-h-56 flex-col gap-3 rounded-card border border-bisque bg-white/60 p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-bisque text-xl font-bold text-mocha"
        >
          {worker.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{worker.displayName}</h3>
          <p className="truncate text-sm text-mocha">{t(`categories.${worker.categorySlug}`)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1 text-mocha">
          <Star className="size-4" aria-hidden="true" />
          {worker.rating.toFixed(1)} ({worker.reviewsCount})
        </span>
        {worker.isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pistachio px-2 py-0.5 font-medium text-espresso">
            <BadgeCheck className="size-4" aria-hidden="true" />
            {t('home.verified')}
          </span>
        )}
      </div>
      {worker.minPrice !== null && (
        <p className="font-semibold">
          {t('common.from')} {formatPrice(worker.minPrice, t('common.currency'))}
        </p>
      )}
      <Link to={`/hunarmand/${worker.id}`} className={buttonClasses('primary', 'md', 'w-full')}>
        {t('home.orderCta')}
      </Link>
    </li>
  );
}

export function FeaturedWorkers() {
  const { t } = useTranslation();
  const { data, isPending, isError } = useFeaturedWorkers();

  return (
    <section aria-labelledby="home-featured" className="space-y-3">
      <h2 id="home-featured" className="text-xl font-bold">
        {t('home.featuredTitle')}
      </h2>
      {isPending && (
        // Same grid and card height as the loaded list, so the page below does not jump.
        <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((slot) => (
            <li key={slot} className="min-h-56 animate-pulse rounded-card bg-bisque/60" />
          ))}
        </ul>
      )}
      {isError && <p className="text-mocha">{t('home.featuredError')}</p>}
      {data && data.length === 0 && <p className="text-mocha">{t('home.featuredEmpty')}</p>}
      {data && data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.slice(0, 4).map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </ul>
      )}
    </section>
  );
}
