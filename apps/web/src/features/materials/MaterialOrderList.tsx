import { Phone, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { MaterialOrderDto, MaterialOrderStatus } from '@barakali/shared';
import { formatPrice } from '../../lib/format';
import { formatPhoneDisplay } from '../../lib/phone';

const STATUS_STYLE: Record<MaterialOrderStatus, string> = {
  awaiting_payment: 'bg-bisque',
  paid: 'bg-bisque',
  shipped: 'bg-pistachio',
  delivered: 'bg-pistachio',
  cancelled: 'bg-bisque',
};

/** Who is bringing the order, with a one-tap call: the courier and the worker can reach each other. */
function CourierLine({ order }: { order: MaterialOrderDto }) {
  const { t } = useTranslation();
  if (!order.courier) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-pistachio/40 px-3 py-2">
      <p className="flex items-center gap-2 font-medium">
        <Truck className="size-5 shrink-0 text-mocha" strokeWidth={1.75} aria-hidden="true" />
        {t('materials.courier', { name: order.courier.name })}
      </p>
      <a
        href={`tel:${order.courier.phone}`}
        aria-label={t('materials.callCourierLabel', { name: order.courier.name })}
        className="inline-flex min-h-12 items-center gap-2 rounded-field bg-mocha px-4 font-semibold text-sugar"
      >
        <Phone className="size-5" aria-hidden="true" />
        {formatPhoneDisplay(order.courier.phone)}
      </a>
    </div>
  );
}

function OrderItem({ order }: { order: MaterialOrderDto }) {
  const { t, i18n } = useTranslation();
  const currency = t('common.currency');
  return (
    <li className="space-y-2 rounded-card border border-bisque bg-white/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
          </p>
          <p className="text-sm text-mocha">{formatPrice(order.total, currency)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold text-espresso ${STATUS_STYLE[order.status]}`}
        >
          {t(`materials.status.${order.status}`)}
        </span>
      </div>
      {order.deliveryAddress && (
        <p className="text-sm text-mocha">
          {t('materials.deliverTo', { address: order.deliveryAddress })}
        </p>
      )}
      {order.status === 'paid' && <p className="text-sm">{t('materials.preparing')}</p>}
      {order.status === 'shipped' && <CourierLine order={order} />}
      {order.status === 'delivered' && order.deliveredAt && (
        <p className="text-sm text-mocha">
          {t('materials.deliveredOn', {
            date: new Date(order.deliveredAt).toLocaleDateString(i18n.language),
          })}
        </p>
      )}
      {order.status === 'awaiting_payment' && (
        <Link
          to={`/materiallar/tolov/${order.id}`}
          className="inline-flex min-h-12 items-center rounded-field bg-mocha px-5 font-semibold text-sugar"
        >
          {t('orders.payNow')}
        </Link>
      )}
    </li>
  );
}

export function MaterialOrderList({ orders }: { orders: MaterialOrderDto[] }) {
  const { t } = useTranslation();
  if (orders.length === 0) return null;
  return (
    <section aria-labelledby="mat-orders" className="space-y-3">
      <h2 id="mat-orders" className="text-xl font-bold">
        {t('materials.myOrders')}
      </h2>
      <ul className="space-y-2">
        {orders.map((order) => (
          <OrderItem key={order.id} order={order} />
        ))}
      </ul>
    </section>
  );
}
