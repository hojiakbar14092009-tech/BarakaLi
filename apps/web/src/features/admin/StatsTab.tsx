import { useTranslation } from 'react-i18next';
import { COMMISSION_RATE_PERCENT, ORDER_STATUSES } from '@barakali/shared';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useAdminStats } from './api';

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-card bg-bisque/60 p-4">
      <dt className="text-sm text-mocha">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

export function StatsTab() {
  const { t } = useTranslation();
  const stats = useAdminStats();
  const currency = t('common.currency');

  if (stats.isPending) return <LoadingState />;
  if (stats.isError) {
    return (
      <ErrorState message={errorMessage(stats.error, t)} onRetry={() => void stats.refetch()} />
    );
  }
  const data = stats.data;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t('admin.stats.users')} value={String(data.users)} />
        <Tile label={t('admin.stats.workers')} value={String(data.workers)} />
        <Tile label={t('admin.stats.verified')} value={String(data.approvedWorkers)} />
        <Tile label={t('admin.stats.pending')} value={String(data.pendingWorkers)} />
        <Tile label={t('admin.stats.turnover')} value={formatPrice(data.turnover, currency)} />
        <Tile
          label={t('admin.stats.commission', { percent: COMMISSION_RATE_PERCENT })}
          value={formatPrice(data.commission, currency)}
        />
        <Tile label={t('admin.stats.complaints')} value={String(data.openComplaints)} />
        <Tile label={t('admin.stats.hidden')} value={String(data.hiddenReviews)} />
      </dl>
      <section aria-labelledby="stats-orders" className="space-y-2">
        <h2 id="stats-orders" className="text-lg font-bold">
          {t('admin.stats.byStatus')}
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER_STATUSES.map((status) => (
            <li
              key={status}
              className="flex items-center justify-between rounded-field border border-bisque bg-white/60 px-3 py-2"
            >
              <span>{t(`orders.status.${status}`)}</span>
              <span className="font-bold">{data.ordersByStatus[status] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
