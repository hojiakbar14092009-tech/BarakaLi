import { COMMISSION_RATE_PERCENT } from '@barakali/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useAdminStats } from './api';

interface CardProps {
  label: string;
  value: string;
  to: string;
  linkLabel: string;
  highlight?: boolean;
}

function Card({ label, value, to, linkLabel, highlight }: CardProps) {
  return (
    <li
      className={`flex flex-col gap-2 rounded-card p-5 shadow-soft ${
        highlight ? 'bg-mocha text-sugar' : 'border border-bisque bg-sugar'
      }`}
    >
      <p className={`text-sm ${highlight ? 'text-sugar/85' : 'text-mocha'}`}>{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <Link
        to={to}
        className={`mt-auto inline-flex min-h-12 items-center font-semibold underline-offset-4 hover:underline ${
          highlight ? 'text-sugar' : 'text-espresso'
        }`}
      >
        {linkLabel}
      </Link>
    </li>
  );
}

export default function DashboardPage() {
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
  const nothingYet = data.workers === 0 && data.users <= 1 && data.turnover === 0;

  return (
    <section aria-labelledby="admin-title" className="space-y-6">
      <h1 id="admin-title" className="text-3xl font-bold">
        {t('admin.nav.dashboard')}
      </h1>
      {nothingYet ? (
        <EmptyState
          title={t('admin.dashboard.emptyTitle')}
          hint={t('admin.dashboard.emptyHint')}
          action={
            <Link to="/admin/sozlamalar" className="font-semibold text-espresso underline">
              {t('admin.nav.settings')}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            label={t('admin.dashboard.pending')}
            value={String(data.pendingWorkers)}
            to="/admin/hunarmandlar"
            linkLabel={t('admin.dashboard.review')}
            highlight={data.pendingWorkers > 0}
          />
          <Card
            label={t('admin.dashboard.ordersToday')}
            value={String(data.ordersToday)}
            to="/admin/buyurtmalar"
            linkLabel={t('admin.dashboard.openOrders')}
          />
          <Card
            label={t('admin.dashboard.turnover')}
            value={formatPrice(data.turnover, currency)}
            to="/admin/buyurtmalar"
            linkLabel={t('admin.dashboard.openOrders')}
          />
          <Card
            label={t('admin.dashboard.commission', { percent: COMMISSION_RATE_PERCENT })}
            value={formatPrice(data.commission, currency)}
            to="/admin/sozlamalar"
            linkLabel={t('admin.dashboard.commissionNote')}
          />
          <Card
            label={t('admin.dashboard.complaints')}
            value={String(data.openComplaints)}
            to="/admin/sharhlar"
            linkLabel={t('admin.dashboard.openComplaints')}
            highlight={data.openComplaints > 0}
          />
        </ul>
      )}
    </section>
  );
}
