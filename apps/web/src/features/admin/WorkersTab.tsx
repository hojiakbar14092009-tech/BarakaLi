import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { useAdminWorkers, useSetVerified } from './api';

const FILTERS = ['pending', 'verified', 'all'] as const;

export function WorkersTab() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [page, setPage] = useState(1);
  const workers = useAdminWorkers(page, filter === 'all' ? undefined : filter);
  const verify = useSetVerified();

  return (
    <section aria-labelledby="admin-workers" className="space-y-3">
      <h2 id="admin-workers" className="sr-only">
        {t('admin.tabs.workers')}
      </h2>
      <div role="group" aria-label={t('admin.filter')} className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={`min-h-12 rounded-full px-4 font-semibold ${
              filter === value ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
            }`}
          >
            {t(`admin.workers.filter.${value}`)}
          </button>
        ))}
      </div>
      {workers.isPending && <LoadingState />}
      {workers.isError && (
        <ErrorState
          message={errorMessage(workers.error, t)}
          onRetry={() => void workers.refetch()}
        />
      )}
      {workers.data && workers.data.items.length === 0 && (
        <EmptyState title={t('admin.workers.empty')} />
      )}
      <ul className="space-y-2">
        {workers.data?.items.map((worker) => (
          <li
            key={worker.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                {worker.displayName}
                {worker.isVerified && (
                  <BadgeCheck className="size-5 text-mocha" aria-label={t('home.verified')} />
                )}
              </p>
              <p className="text-sm text-mocha">
                {t(`categories.${worker.categorySlug}`)} · {worker.phone}
              </p>
              <p className="text-sm text-mocha">
                {worker.rating.toFixed(1)} ({worker.reviewsCount})
              </p>
            </div>
            <Button
              variant={worker.isVerified ? 'secondary' : 'primary'}
              disabled={verify.isPending}
              onClick={() => verify.mutate({ id: worker.id, verified: !worker.isVerified })}
            >
              {worker.isVerified ? t('admin.workers.unverify') : t('admin.workers.verify')}
            </Button>
          </li>
        ))}
      </ul>
      {verify.isError && <p role="alert">{errorMessage(verify.error, t)}</p>}
      {workers.data && (
        <Pagination
          page={workers.data.page}
          pageSize={workers.data.pageSize}
          total={workers.data.total}
          onChange={setPage}
        />
      )}
    </section>
  );
}
