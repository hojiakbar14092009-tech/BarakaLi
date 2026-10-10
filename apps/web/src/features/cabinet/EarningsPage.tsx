import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useEarnings } from '../orders/api';
import { shortId } from '../orders/OrdersPage';
import { SavingsGoal } from './SavingsGoal';

export default function EarningsPage() {
  const { t, i18n } = useTranslation();
  const earnings = useEarnings();
  const currency = t('common.currency');
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';

  if (earnings.isPending) return <LoadingState />;
  if (earnings.isError) {
    return (
      <ErrorState
        message={errorMessage(earnings.error, t)}
        onRetry={() => void earnings.refetch()}
      />
    );
  }
  const data = earnings.data;

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-3xl font-bold">{t('cabinet.earnings.title')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-1 rounded-card bg-mocha p-5 text-sugar">
          <p>{t('cabinet.earnings.month')}</p>
          <p className="text-4xl font-bold">{formatPrice(data.monthTotal, currency)}</p>
          <p className="text-sm text-sugar/85">{t('cabinet.afterCommission')}</p>
        </section>
        <section className="space-y-1 rounded-card bg-bisque p-5">
          <p>{t('cabinet.earnings.allTime')}</p>
          <p className="text-4xl font-bold">{formatPrice(data.allTimeTotal, currency)}</p>
        </section>
      </div>

      <SavingsGoal />

      <section aria-labelledby="earnings-history" className="space-y-3">
        <h2 id="earnings-history" className="text-xl font-bold">
          {t('cabinet.earnings.history')}
        </h2>
        {data.history.length === 0 ? (
          <EmptyState title={t('cabinet.earnings.empty')} />
        ) : (
          <ul className="space-y-2">
            {data.history.map((entry) => (
              <li key={entry.orderId}>
                <Link
                  to={`/buyurtmalar/${entry.orderId}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
                >
                  <span>
                    <span className="block font-semibold">
                      {t('orders.orderNo', { id: shortId(entry.orderId) })}
                    </span>
                    <span className="block text-sm text-mocha">
                      {new Date(entry.createdAt).toLocaleDateString(locale, {
                        timeZone: 'Asia/Tashkent',
                      })}
                      {' · '}
                      {t('cabinet.earnings.commissionLine', {
                        amount: formatPrice(entry.commission, currency),
                      })}
                    </span>
                  </span>
                  <span className="text-lg font-bold">{formatPrice(entry.amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
