import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { OrderDto } from '@barakali/shared';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';
import { useOrders, type OrderSide } from './api';
import { StatusBadge } from './StatusBadge';

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function OrderRow({ order }: { order: OrderDto }) {
  const { t, i18n } = useTranslation();
  const date = new Date(order.createdAt).toLocaleDateString(
    i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ',
    {
      timeZone: 'Asia/Tashkent',
    },
  );
  const amount = order.viewerRole === 'worker' ? order.workerAmount : order.total;
  return (
    <li>
      <Link
        to={`/buyurtmalar/${order.id}`}
        className="block space-y-2 rounded-card border border-bisque bg-white/60 p-4 shadow-soft"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">{t('orders.orderNo', { id: shortId(order.id) })}</span>
          <StatusBadge status={order.status} />
        </div>
        <p className="line-clamp-2 text-mocha">
          {order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ')}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-mocha">{date}</span>
          <span className="text-lg font-bold">{formatPrice(amount, t('common.currency'))}</span>
        </div>
      </Link>
    </li>
  );
}

function OrderList({ side }: { side: OrderSide }) {
  const { t } = useTranslation();
  const orders = useOrders(side);
  if (orders.isPending) return <LoadingState />;
  if (orders.isError) {
    return (
      <ErrorState message={errorMessage(orders.error, t)} onRetry={() => void orders.refetch()} />
    );
  }
  if (orders.data.length === 0) {
    return <EmptyState title={t(side === 'worker' ? 'orders.emptyIncoming' : 'orders.empty')} />;
  }
  return (
    <ul className="space-y-3">
      {orders.data.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const isWorker = useAuthStore((s) => s.user?.workerId != null);
  const [side, setSide] = useState<OrderSide>(isWorker ? 'worker' : 'customer');

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-3xl font-bold">
        {side === 'worker' ? t('orders.incomingTitle') : t('orders.title')}
      </h1>
      {isWorker && (
        <div role="tablist" className="flex gap-2">
          {(['worker', 'customer'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={side === value}
              onClick={() => setSide(value)}
              className={`min-h-12 rounded-full px-5 font-semibold ${
                side === value ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
              }`}
            >
              {t(value === 'worker' ? 'orders.tabIncoming' : 'orders.tabMine')}
            </button>
          ))}
        </div>
      )}
      <OrderList side={side} />
    </div>
  );
}
