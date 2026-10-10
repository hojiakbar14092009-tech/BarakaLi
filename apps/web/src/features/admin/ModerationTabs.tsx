import { Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MAX_ADMIN_NOTE_LENGTH,
  MAX_REJECT_REASON_LENGTH,
  MIN_REJECT_REASON_LENGTH,
  type AdminComplaintDto,
  type AdminReviewDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { StatusBadge } from '../orders/StatusBadge';
import { shortId } from '../orders/OrdersPage';
import { useAdminComplaints, useAdminReviews, useSetReviewStatus, useUpdateComplaint } from './api';

const REFUNDABLE = ['new', 'accepted', 'in_progress', 'ready'];

function ReviewItem({ review }: { review: AdminReviewDto }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const setStatus = useSetReviewStatus();
  const hidden = review.status === 'hidden';
  const label = hidden ? t('admin.reviews.show') : t('admin.reviews.hide');
  const dialogKey = hidden ? 'show' : 'hide';

  return (
    <li className="space-y-2 rounded-card border border-bisque bg-white/60 p-4">
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
      {review.comment && <p className="whitespace-pre-line break-words">{review.comment}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-mocha">
          {t(`admin.reviews.status.${review.status}`)}
          {review.moderationReason ? ` · ${review.moderationReason}` : ''}
        </span>
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-label={`${label}: ${review.workerName}`}
        >
          {label}
        </Button>
      </div>
      {open && (
        <ConfirmDialog
          open
          title={t(`admin.reviews.dialog.${dialogKey}.title`)}
          description={t(`admin.reviews.dialog.${dialogKey}.text`)}
          confirmLabel={t(`admin.reviews.dialog.${dialogKey}.confirm`)}
          reason={
            hidden
              ? undefined
              : {
                  label: t('admin.reviews.dialog.hide.reasonLabel'),
                  hint: t('admin.workers.reasonHint', { min: MIN_REJECT_REASON_LENGTH }),
                  minLength: MIN_REJECT_REASON_LENGTH,
                  maxLength: MAX_REJECT_REASON_LENGTH,
                }
          }
          destructive={!hidden}
          pending={setStatus.isPending}
          error={setStatus.isError ? errorMessage(setStatus.error, t) : undefined}
          onConfirm={(reason) =>
            setStatus.mutate(
              {
                id: review.id,
                status: hidden ? 'visible' : 'hidden',
                reason: hidden ? undefined : reason,
              },
              { onSuccess: () => setOpen(false) },
            )
          }
          onClose={() => setOpen(false)}
        />
      )}
    </li>
  );
}

export function ReviewsTab() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const reviews = useAdminReviews(page);

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
        {reviews.data?.items.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
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

type Decision = 'in_review' | 'resolved' | 'dismissed';

function ComplaintItem({ complaint }: { complaint: AdminComplaintDto }) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<Decision | null>(null);
  const update = useUpdateComplaint();
  const openLike = complaint.status === 'open' || complaint.status === 'in_review';
  const actions: Decision[] =
    complaint.status === 'open'
      ? ['in_review', 'resolved', 'dismissed']
      : complaint.status === 'in_review'
        ? ['resolved', 'dismissed']
        : [];
  const refundable =
    complaint.paymentStatus === 'paid' && REFUNDABLE.includes(complaint.orderStatus);

  return (
    <li className="space-y-3 rounded-card border border-bisque bg-white/60 p-4">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/admin/buyurtmalar/${complaint.orderId}`}
          className="inline-flex min-h-12 items-center font-semibold underline-offset-4 hover:underline"
        >
          {t('orders.orderNo', { id: shortId(complaint.orderId) })}
        </Link>
        <StatusBadge status={complaint.orderStatus} />
      </p>
      <p className="text-sm text-mocha">
        {t(`admin.complaints.role.${complaint.authorRole}`)}: {complaint.authorName ?? '—'}
        {' · '}
        {t(`admin.complaints.status.${complaint.status}`)}
      </p>
      <p className="whitespace-pre-line break-words">{complaint.reason}</p>
      {complaint.adminNote && (
        <p className="rounded-field bg-bisque/50 px-3 py-2 text-sm">
          <span className="text-mocha">{t('admin.complaints.note')}: </span>
          {complaint.adminNote}
        </p>
      )}
      {openLike && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant={action === 'resolved' ? 'primary' : 'secondary'}
              onClick={() => setDecision(action)}
            >
              {t(`admin.complaints.actions.${action}`)}
            </Button>
          ))}
          {refundable && (
            <Link
              to={`/admin/buyurtmalar/${complaint.orderId}`}
              className="inline-flex min-h-12 items-center rounded-field bg-bisque px-5 font-semibold text-espresso"
            >
              {t('admin.complaints.refund')}
            </Link>
          )}
        </div>
      )}
      {decision && (
        <ConfirmDialog
          open
          title={t(`admin.complaints.dialog.${decision}.title`)}
          description={t(`admin.complaints.dialog.${decision}.text`)}
          confirmLabel={t(`admin.complaints.actions.${decision}`)}
          reason={{
            label: t('admin.complaints.noteLabel'),
            hint: t('admin.complaints.noteHint'),
            minLength: 0,
            maxLength: MAX_ADMIN_NOTE_LENGTH,
          }}
          destructive={decision === 'dismissed'}
          pending={update.isPending}
          error={update.isError ? errorMessage(update.error, t) : undefined}
          onConfirm={(note) =>
            update.mutate(
              { id: complaint.id, status: decision, adminNote: note || undefined },
              { onSuccess: () => setDecision(null) },
            )
          }
          onClose={() => setDecision(null)}
        />
      )}
    </li>
  );
}

export function ComplaintsTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'open' | 'in_review' | 'all'>('open');
  const [page, setPage] = useState(1);
  const complaints = useAdminComplaints(page, status === 'all' ? undefined : status);

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t('admin.filter')} className="flex flex-wrap gap-2">
        {(['open', 'in_review', 'all'] as const).map((value) => (
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
          <ComplaintItem key={complaint.id} complaint={complaint} />
        ))}
      </ul>
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
