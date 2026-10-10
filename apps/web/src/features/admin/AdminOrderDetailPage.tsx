import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { COMMISSION_RATE_PERCENT, type OrderStatus } from '@barakali/shared';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { formatPhoneDisplay } from '../../lib/phone';
import { StatusBadge } from '../orders/StatusBadge';
import { useAdminOrder, useRefundOrder, useSetOrderStatus } from './api';

const REFUNDABLE: OrderStatus[] = ['new', 'accepted', 'in_progress', 'ready'];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-mocha">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const order = useAdminOrder(id);
  const setStatus = useSetOrderStatus();
  const refund = useRefundOrder();
  const [next, setNext] = useState('');
  const [dialog, setDialog] = useState<'status' | 'refund' | null>(null);
  const currency = t('common.currency');
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  });
  const data = order.data;
  const canRefund = data?.paymentStatus === 'paid' && REFUNDABLE.includes(data.status);
  const chosen = data?.allowedTransitions.includes(next as OrderStatus)
    ? (next as OrderStatus)
    : null;

  return (
    <section aria-labelledby="order-title" className="space-y-4">
      <Link
        to="/admin/buyurtmalar"
        className="inline-flex min-h-12 items-center gap-2 text-mocha hover:text-espresso"
      >
        <ArrowLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        {t('admin.orderDetail.back')}
      </Link>
      {order.isPending && <LoadingState />}
      {order.isError && (
        <ErrorState message={errorMessage(order.error, t)} onRetry={() => void order.refetch()} />
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 id="order-title" className="text-3xl font-bold">
              {t('admin.orderDetail.title', { id: data.id.slice(0, 8) })}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <dl className="divide-y divide-bisque rounded-card border border-bisque bg-sugar px-5">
            <Row label={t('admin.orderDetail.customer')}>
              {data.customer.name ?? '—'} ·{' '}
              <a href={`tel:${data.customer.phone}`} className="underline underline-offset-4">
                {formatPhoneDisplay(data.customer.phone)}
              </a>
            </Row>
            <Row label={t('admin.orderDetail.worker')}>
              <Link
                to={`/admin/hunarmandlar/${data.worker.id}`}
                className="underline underline-offset-4"
              >
                {data.worker.name}
              </Link>{' '}
              ·{' '}
              <a href={`tel:${data.worker.phone}`} className="underline underline-offset-4">
                {formatPhoneDisplay(data.worker.phone)}
              </a>
            </Row>
            <Row label={t('admin.orderDetail.items')}>
              <ul className="space-y-1">
                {data.items.map((item) => (
                  <li key={item.id}>
                    {item.title} × {item.quantity} · {formatPrice(item.unitPrice, currency)}
                  </li>
                ))}
                {data.items.length === 0 && <li className="text-mocha">—</li>}
              </ul>
            </Row>
            <Row label={t('admin.orderDetail.money')}>
              {formatPrice(data.total, currency)} ·{' '}
              {t('admin.orderDetail.commission', {
                percent: Math.round(data.commissionRate * 100) || COMMISSION_RATE_PERCENT,
                amount: formatPrice(data.commission, currency),
              })}{' '}
              ·{' '}
              {t('admin.orderDetail.workerAmount', {
                amount: formatPrice(data.workerAmount, currency),
              })}
            </Row>
            <Row label={t('admin.orderDetail.payment')}>
              {data.paymentStatus
                ? t(`admin.orderDetail.paymentStatus.${data.paymentStatus}`)
                : '—'}
            </Row>
            <Row label={t('admin.orderDetail.fulfillment')}>
              {t(`cart.${data.fulfillment}`)}
              {data.deliveryAddress ? ` · ${data.deliveryAddress}` : ''}
            </Row>
            {data.startTime && data.endTime && (
              <Row label={t('admin.orderDetail.slot')}>
                {dateFormat.format(new Date(data.startTime))} –{' '}
                {dateFormat.format(new Date(data.endTime))}
              </Row>
            )}
            {data.description && (
              <Row label={t('admin.orderDetail.description')}>{data.description}</Row>
            )}
            <Row label={t('admin.orderDetail.created')}>
              {dateFormat.format(new Date(data.createdAt))}
            </Row>
          </dl>

          <section
            aria-labelledby="order-actions"
            className="space-y-3 rounded-card border border-bisque bg-sugar p-5"
          >
            <h2 id="order-actions" className="text-xl font-bold">
              {t('admin.orderDetail.actions')}
            </h2>
            {data.allowedTransitions.length > 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1">
                  <SelectField
                    label={t('admin.orderDetail.nextStatus')}
                    value={next}
                    onChange={(event) => setNext(event.target.value)}
                    options={[
                      { value: '', label: t('admin.orderDetail.choose') },
                      ...data.allowedTransitions.map((value) => ({
                        value,
                        label: t(`orders.status.${value}`),
                      })),
                    ]}
                  />
                </div>
                <Button disabled={!chosen} onClick={() => setDialog('status')}>
                  {t('admin.orderDetail.changeStatus')}
                </Button>
              </div>
            ) : (
              <p className="text-mocha">{t('admin.orderDetail.closed')}</p>
            )}
            {canRefund && (
              <Button variant="secondary" onClick={() => setDialog('refund')}>
                {t('admin.complaints.refund')}
              </Button>
            )}
          </section>

          {data.refunds.length > 0 && (
            <section aria-labelledby="order-refunds" className="space-y-2">
              <h2 id="order-refunds" className="text-xl font-bold">
                {t('admin.orderDetail.refunds')}
              </h2>
              <ul className="divide-y divide-bisque rounded-card border border-bisque bg-sugar">
                {data.refunds.map((item) => (
                  <li key={item.id} className="p-4">
                    <p className="font-semibold">{formatPrice(item.amount, currency)}</p>
                    <p className="text-sm text-mocha">
                      {dateFormat.format(new Date(item.createdAt))}
                      {item.adminName ? ` · ${item.adminName}` : ''}
                      {item.reason ? ` · ${item.reason}` : ''}
                      {item.commissionReversed > 0
                        ? ` · ${t('admin.orderDetail.commissionReversed', {
                            amount: formatPrice(item.commissionReversed, currency),
                          })}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dialog === 'status' && chosen && (
            <ConfirmDialog
              open
              title={t('admin.orderDetail.dialog.status.title')}
              description={t('admin.orderDetail.dialog.status.text', {
                from: t(`orders.status.${data.status}`),
                to: t(`orders.status.${chosen}`),
              })}
              confirmLabel={t('admin.orderDetail.changeStatus')}
              pending={setStatus.isPending}
              error={setStatus.isError ? errorMessage(setStatus.error, t) : undefined}
              onConfirm={() =>
                setStatus.mutate(
                  { id: data.id, status: chosen },
                  {
                    onSuccess: () => {
                      setDialog(null);
                      setNext('');
                    },
                  },
                )
              }
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === 'refund' && (
            <ConfirmDialog
              open
              title={t('admin.orderDetail.dialog.refund.title')}
              description={t('admin.orderDetail.dialog.refund.text', {
                amount: formatPrice(data.total, currency),
              })}
              confirmLabel={t('admin.orderDetail.dialog.refund.confirm')}
              reason={{
                label: t('admin.orderDetail.dialog.refund.reasonLabel'),
                hint: t('admin.orderDetail.dialog.refund.reasonHint'),
                minLength: 0,
                maxLength: 300,
              }}
              destructive
              pending={refund.isPending}
              error={refund.isError ? errorMessage(refund.error, t) : undefined}
              onConfirm={(reason) =>
                refund.mutate(
                  { orderId: data.id, reason: reason || undefined },
                  { onSuccess: () => setDialog(null) },
                )
              }
              onClose={() => setDialog(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
