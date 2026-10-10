import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { StatusBadge } from '../orders/StatusBadge';
import { shortId } from '../orders/OrdersPage';
import {
  useAdminComplaints,
  useAdminReviews,
  useRefundOrder,
  useResolveComplaint,
  useSetReviewStatus,
} from './api';

const REFUNDABLE = ['new', 'accepted', 'in_progress', 'ready'];

export function ReviewsTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const reviews = useAdminReviews(page);
  const setStatus = useSetReviewStatus();

  return (
    <div className="space-y-3">
      {reviews.isPending && <LoadingState />}
      {reviews.isError && (
        <ErrorState
          message={errorMessage(reviews.error, t)}
          onRetry={() => void reviews.refetch()}
        />
      )}
      {reviews.data && reviews.data.items.length === 0 && (
        <EmptyState title={t('admin.reviews.empty')} />
      )}
      <ul className="space-y-2">
        {reviews.data?.items.map((review) => {
          const hidden = review.status === 'hidden';
          return (
            <li
              key={review.id}
              className="space-y-2 rounded-card border border-bisque bg-white/60 p-4"
            >
              <p className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {review.workerName} ← {review.authorName ?? '—'}
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  aria-label={t('orders.review.stars', { count: review.rating })}
                >
                  <Star className="size-4" aria-hidden="true" />
                  {review.rating}
                </span>
              </p>
              {review.comment && (
                <p className="whitespace-pre-line break-words">{review.comment}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-mocha">
                  {t(`admin.reviews.status.${review.status}`)}
                </span>
                <Button
                  variant={hidden ? 'primary' : 'secondary'}
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({ id: review.id, status: hidden ? 'visible' : 'hidden' })
                  }
                >
                  {hidden ? t('admin.reviews.show') : t('admin.reviews.hide')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {setStatus.isError && <p role="alert">{errorMessage(setStatus.error, t)}</p>}
      {reviews.data && (
        <Pagination
          page={reviews.data.page}
          pageSize={reviews.data.pageSize}
          total={reviews.data.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}

export function ComplaintsTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'open' | 'all'>('open');
  const [page, setPage] = useState(1);
  const complaints = useAdminComplaints(page, status === 'open' ? 'open' : undefined);
  const resolve = useResolveComplaint();
  const refund = useRefundOrder();
  const failure = resolve.error ?? refund.error;

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t('admin.filter')} className="flex gap-2">
        {(['open', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={`min-h-12 rounded-full px-4 font-semibold ${
              status === value ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
            }`}
          >
            {t(`admin.complaints.filter.${value}`)}
          </button>
        ))}
      </div>
      {complaints.isPending && <LoadingState />}
      {complaints.isError && (
        <ErrorState
          message={errorMessage(complaints.error, t)}
          onRetry={() => void complaints.refetch()}
        />
      )}
      {complaints.data && complaints.data.items.length === 0 && (
        <EmptyState title={t('admin.complaints.empty')} />
      )}
      <ul className="space-y-3">
        {complaints.data?.items.map((complaint) => (
          <li
            key={complaint.id}
            className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
          >
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {t('orders.orderNo', { id: shortId(complaint.orderId) })}
              </span>
              <StatusBadge status={complaint.orderStatus} />
            </p>
            <p className="text-sm text-mocha">
              {t(`admin.complaints.role.${complaint.authorRole}`)}: {complaint.authorName ?? '—'}
              {' · '}
              {t(`admin.complaints.status.${complaint.status}`)}
            </p>
            <p className="whitespace-pre-line break-words">{complaint.reason}</p>
            {complaint.status === 'open' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: complaint.id, status: 'resolved' })}
                >
                  {t('admin.complaints.resolve')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: complaint.id, status: 'dismissed' })}
                >
                  {t('admin.complaints.dismiss')}
                </Button>
                {complaint.paymentStatus === 'paid' &&
                  REFUNDABLE.includes(complaint.orderStatus) && (
                    <Button
                      variant="secondary"
                      disabled={refund.isPending}
                      onClick={() => refund.mutate(complaint.orderId)}
                    >
                      {t('admin.complaints.refund')}
                    </Button>
                  )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {failure && <p role="alert">{errorMessage(failure, t)}</p>}
      {complaints.data && (
        <Pagination
          page={complaints.data.page}
          pageSize={complaints.data.pageSize}
          total={complaints.data.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
