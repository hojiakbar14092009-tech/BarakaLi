import { MapPin, Phone, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PHONE_COUNTRY_PREFIX,
  materialShipSchema,
  type AdminMaterialOrderDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { formatPhoneDisplay } from '../../lib/phone';
import { useMarkMaterialsRead, useNotifications } from '../notifications/api';
import { useAdminMaterialOrders, useDeliverMaterialOrder, useShipMaterialOrder } from './api';

/** Courier name and phone, then one tap sends the order out and tells the worker. */
function ShipForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const ship = useShipMaterialOrder();
  const [name, setName] = useState('');
  const [digits, setDigits] = useState('');
  const input = { courierName: name, courierPhone: `${PHONE_COUNTRY_PREFIX}${digits}` };
  const valid = materialShipSchema.safeParse(input).success;
  return (
    <form
      className="space-y-3 rounded-field border border-bisque bg-sugar p-3"
      aria-label={t('admin.materials.shipTitle')}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) ship.mutate({ id: orderId, input }, { onSuccess: onDone });
      }}
    >
      <Field
        label={t('admin.materials.courierName')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <PhoneInput label={t('admin.materials.courierPhone')} value={digits} onChange={setDigits} />
      {ship.isError && <p role="alert">{errorMessage(ship.error, t)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!valid || ship.isPending}>
          <Truck className="size-5" aria-hidden="true" />
          {t('admin.materials.shipConfirm')}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

function WorkerContact({ order }: { order: AdminMaterialOrderDto }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 text-sm">
      <a
        href={`tel:${order.workerPhone}`}
        aria-label={t('admin.materials.callWorker', { name: order.workerName })}
        className="inline-flex min-h-12 items-center gap-2 font-semibold text-espresso underline"
      >
        <Phone className="size-4 text-mocha" aria-hidden="true" />
        {t('admin.materials.workerPhone', { phone: formatPhoneDisplay(order.workerPhone) })}
      </a>
      <p className="flex items-start gap-2 text-mocha">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {order.deliveryAddress
          ? t('admin.materials.address', { address: order.deliveryAddress })
          : t('admin.materials.noAddress')}
      </p>
    </div>
  );
}

function OrderActions({ order }: { order: AdminMaterialOrderDto }) {
  const { t } = useTranslation();
  const deliver = useDeliverMaterialOrder();
  const [shipping, setShipping] = useState(false);
  if (order.status === 'paid') {
    return shipping ? (
      <ShipForm orderId={order.id} onDone={() => setShipping(false)} />
    ) : (
      <Button onClick={() => setShipping(true)}>
        <Truck className="size-5" aria-hidden="true" />
        {t('admin.materials.ship')}
      </Button>
    );
  }
  if (order.status === 'shipped' && order.courier) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {t('admin.materials.courier', {
            name: order.courier.name,
            phone: formatPhoneDisplay(order.courier.phone),
          })}
        </p>
        <Button disabled={deliver.isPending} onClick={() => deliver.mutate(order.id)}>
          {t('admin.materials.deliver')}
        </Button>
        {deliver.isError && <p role="alert">{errorMessage(deliver.error, t)}</p>}
      </div>
    );
  }
  return null;
}

function OrderCard({ order, isNew }: { order: AdminMaterialOrderDto; isNew: boolean }) {
  const { t } = useTranslation();
  return (
    <li className="space-y-3 rounded-card border border-bisque bg-white/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{order.workerName}</p>
          <p className="text-sm text-mocha">
            {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
          </p>
          <p className="text-sm font-semibold">{formatPrice(order.total, t('common.currency'))}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isNew && (
            <span className="rounded-full bg-mocha px-3 py-1 text-sm font-semibold text-sugar">
              {t('admin.materials.new')}
            </span>
          )}
          <span className="rounded-full bg-bisque px-3 py-1 text-sm font-semibold text-espresso">
            {t(`materials.status.${order.status}`)}
          </span>
        </div>
      </div>
      <WorkerContact order={order} />
      <OrderActions order={order} />
    </li>
  );
}

/** Orders that came with an unread notice are marked "new" for this visit; the badge then clears. */
function useNewOrderIds(): Set<string> {
  const notifications = useNotifications();
  const markRead = useMarkMaterialsRead();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const captured = useRef(false);
  useEffect(() => {
    const data = notifications.data;
    if (!data || captured.current) return;
    captured.current = true;
    const unread = data.items.filter(
      (item) => item.kind === 'material_order_paid' && !item.readAt && item.materialOrderId,
    );
    setIds(new Set(unread.map((item) => item.materialOrderId ?? '')));
    if (data.unreadMaterials > 0) markRead.mutate();
  }, [notifications.data, markRead]);
  return ids;
}

export function AdminMaterialOrders() {
  const { t } = useTranslation();
  const orders = useAdminMaterialOrders();
  const newIds = useNewOrderIds();
  return (
    <section aria-labelledby="admin-material-orders" className="space-y-3">
      <h2 id="admin-material-orders" className="text-lg font-bold">
        {t('admin.materials.orders')}
      </h2>
      <p className="text-mocha">{t('admin.materials.ordersIntro')}</p>
      {orders.data?.length === 0 && <p className="text-mocha">{t('admin.materials.noOrders')}</p>}
      <ul className="space-y-2">
        {orders.data?.map((order) => (
          <OrderCard key={order.id} order={order} isNew={newIds.has(order.id)} />
        ))}
      </ul>
    </section>
  );
}
