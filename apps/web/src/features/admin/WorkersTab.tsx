import { BadgeCheck, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { WORKER_STATUSES, type WorkerStatus } from '@barakali/shared';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPhoneDisplay } from '../../lib/phone';
import { Pagination } from '../catalog/Pagination';
import { useAdminWorkers } from './api';
import { WorkerActions } from './WorkerActions';

export function WorkersTab() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<WorkerStatus>('pending');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const workers = useAdminWorkers(page, filter, q || undefined);
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setQ(draft.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t('admin.filter')} className="flex flex-wrap gap-2">
        {WORKER_STATUSES.map((value) => (
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
      <form role="search" onSubmit={onSearch} className="flex gap-2">
        <label className="sr-only" htmlFor="worker-search">
          {t('admin.workers.search.label')}
        </label>
        <input
          id="worker-search"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('admin.workers.search.placeholder')}
          className="min-h-12 w-full rounded-field border border-wheat bg-white/70 px-4 text-base text-espresso placeholder:text-mocha/70"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          <Search className="size-5" strokeWidth={1.5} aria-hidden="true" />
          {t('admin.workers.search.button')}
        </Button>
      </form>
      {workers.isPending && <LoadingState />}
      {workers.isError && (
        <ErrorState
          message={errorMessage(workers.error, t)}
          onRetry={() => void workers.refetch()}
        />
      )}
      {workers.data && workers.data.items.length === 0 && (
        <EmptyState
          title={q ? t('admin.workers.search.empty') : t(`admin.workers.empty.${filter}`)}
        />
      )}
      <ul className="space-y-2">
        {workers.data?.items.map((worker) => (
          <li
            key={worker.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                <Link
                  to={`/admin/hunarmandlar/${worker.id}`}
                  className="inline-flex min-h-12 items-center underline-offset-4 hover:underline"
                >
                  {worker.displayName}
                </Link>
                {worker.status === 'approved' && (
                  <BadgeCheck className="size-5 text-mocha" aria-label={t('home.verified')} />
                )}
              </p>
              <p className="text-sm text-mocha">
                {t(`categories.${worker.categorySlug}`, { defaultValue: worker.categorySlug })} ·{' '}
                {formatPhoneDisplay(worker.phone)} ·{' '}
                {t('admin.workers.detail.productsCount', { count: worker.productsCount })}
              </p>
              <p className="text-sm text-mocha">
                {t(`admin.workers.status.${worker.status}`)}
                {worker.reviewedAt &&
                  ` · ${new Date(worker.reviewedAt).toLocaleDateString(locale, {
                    timeZone: 'Asia/Tashkent',
                  })}`}
              </p>
              {worker.rejectReason && (
                <p className="text-sm">
                  {t('admin.workers.reason')}: {worker.rejectReason}
                </p>
              )}
            </div>
            <WorkerActions worker={worker} />
          </li>
        ))}
      </ul>
      {workers.data && (
        <Pagination
          page={workers.data.page}
          pageSize={workers.data.pageSize}
          total={workers.data.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
