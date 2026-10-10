import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_REJECT_REASON_LENGTH,
  MIN_REJECT_REASON_LENGTH,
  type AdminWorkerDto,
  type WorkerStatus,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { TextAreaField } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { useAdminWorkers, useApproveWorker, useRejectWorker } from './api';
import { formatPhoneDisplay } from '../../lib/phone';

const FILTERS: WorkerStatus[] = ['pending', 'approved', 'rejected'];

function RejectForm({ worker, onDone }: { worker: AdminWorkerDto; onDone: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const reject = useRejectWorker();
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REJECT_REASON_LENGTH;

  return (
    <form
      className="w-full space-y-3 rounded-field bg-bisque/50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) reject.mutate({ id: worker.id, reason: trimmed }, { onSuccess: onDone });
      }}
    >
      <TextAreaField
        label={t('admin.workers.reasonLabel')}
        hint={t('admin.workers.reasonHint', { min: MIN_REJECT_REASON_LENGTH })}
        rows={3}
        maxLength={MAX_REJECT_REASON_LENGTH}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {reject.isError && <p role="alert">{errorMessage(reject.error, t)}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || reject.isPending}>
          {t('admin.workers.confirmReject')}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export function WorkersTab() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<WorkerStatus>('pending');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const workers = useAdminWorkers(page, filter);
  const approve = useApproveWorker();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t('admin.filter')} className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
              setRejecting(null);
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
        <EmptyState title={t(`admin.workers.empty.${filter}`)} />
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
                {worker.status === 'approved' && (
                  <BadgeCheck className="size-5 text-mocha" aria-label={t('home.verified')} />
                )}
              </p>
              <p className="text-sm text-mocha">
                {t(`categories.${worker.categorySlug}`, { defaultValue: worker.categorySlug })} ·{' '}
                {formatPhoneDisplay(worker.phone)}
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
            <div className="flex flex-wrap gap-2">
              {worker.status !== 'approved' && (
                <Button
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(worker.id)}
                  aria-label={`${t('admin.workers.approve')}: ${worker.displayName}`}
                >
                  {t('admin.workers.approve')}
                </Button>
              )}
              {worker.status !== 'rejected' && (
                <Button
                  variant="secondary"
                  onClick={() => setRejecting(worker.id)}
                  aria-label={`${t('admin.workers.reject')}: ${worker.displayName}`}
                >
                  {t('admin.workers.reject')}
                </Button>
              )}
            </div>
            {rejecting === worker.id && (
              <RejectForm worker={worker} onDone={() => setRejecting(null)} />
            )}
          </li>
        ))}
      </ul>
      {approve.isError && <p role="alert">{errorMessage(approve.error, t)}</p>}
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
