import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import type { OrderAction, OrderDto, OrderStatus } from '@barakali/shared';
import { Button, buttonClasses } from '../../components/Button';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useOrder, useOrderAction } from './api';
import { shortId } from './OrdersPage';
import { StatusBadge } from './StatusBadge';

const STEPS: OrderStatus[] = ['new', 'accepted', 'in_progress', 'ready', 'delivered'];

const NEXT_ACTION: Partial<Record<OrderStatus, OrderAction>> = {
  new: 'accept',
  accepted: 'start',
  in_progress: 'ready',
  ready: 'deliver',
};

function Progress({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const index = STEPS.indexOf(status);
  if (index === -1) return null;
  return (
    <ol aria-label={t('orders.progress')} className="grid grid-cols-5 gap-1">
      {STEPS.map((step, i) => (
        <li key={step} className="space-y-1 text-center">
          <span
            className={`mx-auto grid size-8 place-items-center rounded-full text-sm font-bold ${
              i <= index ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
            }`}
          >
            {i < index ? <Check className="size-4" aria-hidden="true" /> : i + 1}
          </span>
          <span
            className={`block text-xs leading-tight ${i === index ? 'font-bold' : 'text-mocha'}`}
          >
            {t(`orders.status.${step}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function WorkerActions({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const mutation = useOrderAction(order.id);
  const next = NEXT_ACTION[order.status];
  if (!next) return null;
  return (
    <section className="space-y-3 rounded-card border border-bisque bg-white/60 p-4">
      <Button
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(next)}
      >
        {t(`orders.actions.${next}`)}
      </Button>
      {order.status === 'new' && (
        <>
          <Button
            variant="secondary"
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate('reject')}
          >
            {t('orders.actions.reject')}
          </Button>
          <p className="text-sm text-mocha">{t('orders.rejectHint')}</p>
        </>
      )}
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
    </section>
  );
}

export default function OrderDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const query = useOrder(id);

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />
    );
  }
  const order = query.data;
  const currency = t('common.currency');
  const isWorker = order.viewerRole === 'worker';
  const date = new Date(order.createdAt).toLocaleString(
    i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ',
    {
      timeZone: 'Asia/Tashkent',
    },
  );

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t('orders.orderNo', { id: shortId(order.id) })}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-sm text-mocha">{t('orders.created', { date })}</span>
        </div>
      </header>

      <Progress status={order.status} />

      {order.status === 'awaiting_payment' && !isWorker && (
        <Link to={`/tolov/${order.id}`} className={buttonClasses('primary', 'lg', 'w-full')}>
          {t('orders.payNow')}
        </Link>
      )}
      {order.status === 'new' && !isWorker && (
        <p className="rounded-field bg-bisque px-4 py-3">{t('orders.waitingWorker')}</p>
      )}
      {isWorker && <WorkerActions order={order} />}

      <section
        aria-labelledby="order-items"
        className="space-y-2 rounded-card border border-bisque bg-white/60 p-4"
      >
        <h2 id="order-items" className="font-bold">
          {t('orders.items')}
        </h2>
        <ul className="divide-y divide-bisque">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-mocha">
                  {formatPrice(item.unitPrice, currency)} × {item.quantity} (
                  {t(`orders.priceType.${item.priceType}`)})
                </p>
              </div>
              <p className="shrink-0 font-semibold">
                {formatPrice(item.unitPrice * item.quantity, currency)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-bisque pt-3">
          <div className="flex justify-between text-lg font-bold">
            <dt>{t('orders.total')}</dt>
            <dd>{formatPrice(order.total, currency)}</dd>
          </div>
          {isWorker && (
            <>
              <div className="flex justify-between text-mocha">
                <dt>{t('orders.commission')}</dt>
                <dd>− {formatPrice(order.commission, currency)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>{t('orders.youReceive')}</dt>
                <dd>{formatPrice(order.workerAmount, currency)}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section
        aria-labelledby="order-contact"
        className="space-y-2 rounded-card border border-bisque bg-white/60 p-4"
      >
        <h2 id="order-contact" className="font-bold">
          {t(isWorker ? 'orders.counterpartCustomer' : 'orders.counterpartWorker')}
        </h2>
        <p>{order.counterpart.name}</p>
        {order.counterpart.phone ? (
          <a
            href={`tel:${order.counterpart.phone}`}
            className="inline-flex min-h-12 items-center font-semibold underline"
          >
            {t('orders.phone')}: {order.counterpart.phone}
          </a>
        ) : (
          <p className="text-mocha">{t('orders.phoneHidden')}</p>
        )}
        <p className="text-mocha">
          {t(`orders.fulfillment.${order.fulfillment}`)}
          {order.deliveryAddress ? `: ${order.deliveryAddress}` : ''}
        </p>
      </section>
    </div>
  );
}
