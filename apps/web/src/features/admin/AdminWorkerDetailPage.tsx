import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPhoneDisplay } from '../../lib/phone';
import { useAdminWorker } from './api';
import { WorkerActions } from './WorkerActions';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-mocha">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function AdminWorkerDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const worker = useAdminWorker(id);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  });

  return (
    <section aria-labelledby="worker-title" className="space-y-4">
      <Link
        to="/admin/hunarmandlar"
        className="inline-flex min-h-12 items-center gap-2 text-mocha hover:text-espresso"
      >
        <ArrowLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        {t('admin.workers.detail.back')}
      </Link>
      {worker.isPending && <LoadingState />}
      {worker.isError && (
        <ErrorState message={errorMessage(worker.error, t)} onRetry={() => void worker.refetch()} />
      )}
      {worker.data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 id="worker-title" className="flex items-center gap-2 text-3xl font-bold">
                {worker.data.displayName}
                {worker.data.status === 'approved' && (
                  <BadgeCheck className="size-7 text-mocha" aria-label={t('home.verified')} />
                )}
              </h1>
              <p className="text-mocha">{t(`admin.workers.status.${worker.data.status}`)}</p>
            </div>
            <WorkerActions worker={worker.data} />
          </div>
          <dl className="divide-y divide-bisque rounded-card border border-bisque bg-sugar px-5">
            <Row label={t('admin.workers.detail.category')}>
              {t(`categories.${worker.data.categorySlug}`, {
                defaultValue: worker.data.categorySlug,
              })}
            </Row>
            <Row label={t('admin.workers.detail.phone')}>
              <a href={`tel:${worker.data.phone}`} className="underline underline-offset-4">
                {formatPhoneDisplay(worker.data.phone)}
              </a>
            </Row>
            <Row label={t('admin.workers.detail.telegram')}>
              {worker.data.telegramUsername ? (
                <a
                  href={`https://t.me/${worker.data.telegramUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  @{worker.data.telegramUsername}
                </a>
              ) : (
                <span className="text-mocha">{t('admin.workers.detail.noTelegram')}</span>
              )}
            </Row>
            <Row label={t('admin.workers.detail.bio')}>
              {worker.data.bio || <span className="text-mocha">—</span>}
            </Row>
            <Row label={t('admin.workers.detail.products')}>
              <Link
                to={`/admin/mahsulotlar?hunarmand=${worker.data.id}`}
                className="underline underline-offset-4"
              >
                {t('admin.workers.detail.productsCount', { count: worker.data.productsCount })}
              </Link>
            </Row>
            <Row label={t('admin.workers.detail.submitted')}>
              {dateFormat.format(new Date(worker.data.createdAt))}
            </Row>
            <Row label={t('admin.workers.detail.reviewed')}>
              {worker.data.reviewedAt
                ? `${dateFormat.format(new Date(worker.data.reviewedAt))}${
                    worker.data.reviewedByName ? ` · ${worker.data.reviewedByName}` : ''
                  }`
                : '—'}
            </Row>
            {worker.data.rejectReason && (
              <Row label={t('admin.workers.reason')}>{worker.data.rejectReason}</Row>
            )}
            {worker.data.status === 'approved' && (
              <Row label={t('admin.workers.detail.publicProfile')}>
                <Link to={`/hunarmand/${worker.data.id}`} className="underline underline-offset-4">
                  {t('admin.workers.detail.openProfile')}
                </Link>
              </Row>
            )}
          </dl>
        </>
      )}
    </section>
  );
}
