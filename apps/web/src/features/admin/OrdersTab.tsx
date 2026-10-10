import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ORDER_STATUSES } from '@barakali/shared';
import { SelectField } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { Pagination } from '../catalog/Pagination';
import { StatusBadge } from '../orders/StatusBadge';
import { useAdminOrders } from './api';

export function OrdersTab() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const orders = useAdminOrders(page, status || undefined);
  const currency = t('common.currency');
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  return (
    <section aria-labelledby="admin-orders" className="space-y-3">
      <h2 id="admin-orders" className="sr-only">
        {t('admin.tabs.orders')}
      </h2>
      <SelectField
        label={t('admin.orders.status')}
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
        options={[
          { value: '', label: t('common.all') },
          ...ORDER_STATUSES.map((value) => ({ value, label: t(`orders.status.${value}`) })),
        ]}
      />
      {orders.isPending && <LoadingState />}
      {orders.isError && (
        <ErrorState message={errorMessage(orders.error, t)} onRetry={() => void orders.refetch()} />
      )}
      {orders.data && orders.data.items.length === 0 && (
        <EmptyState title={t('admin.orders.empty')} />
      )}
      <ul className="space-y-2">
        {orders.data?.items.map((order) => (
          <li
            key={order.id}
            className="space-y-1 rounded-card border border-bisque bg-white/60 p-4"
          >
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">
                {order.workerName} ← {order.customerName ?? '—'}
              </span>
              <StatusBadge status={order.status} />
            </p>
            <p className="flex flex-wrap justify-between gap-2 text-sm text-mocha">
              <span>
                {t(`admin.orders.type.${order.type}`)} ·{' '}
                {new Date(order.createdAt).toLocaleDateString(locale, {
                  timeZone: 'Asia/Tashkent',
                })}
              </span>
              <span className="font-semibold text-espresso">
                {formatPrice(order.total, currency)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      {orders.data && (
        <Pagination
          page={orders.data.page}
          pageSize={orders.data.pageSize}
          total={orders.data.total}
          onChange={setPage}
        />
      )}
    </section>
  );
}
