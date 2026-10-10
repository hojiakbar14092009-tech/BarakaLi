import { CalendarDays, ClipboardList, Package, Wallet, Wheat } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { COMMISSION_RATE_PERCENT } from '@barakali/shared';
import { formatPrice } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';
import { useNotifications } from '../notifications/api';
import { useEarnings } from '../orders/api';
import { useOrders } from '../orders/api';

interface CardProps {
  title: string;
  icon: ReactNode;
  to?: string;
  children: ReactNode;
}

function Card({ title, icon, to, children }: CardProps) {
  const body = (
    <>
      <span className="grid size-12 place-items-center rounded-field bg-sugar text-mocha">
        {icon}
      </span>
      <span className="block text-lg font-bold">{title}</span>
      <span className="block text-mocha">{children}</span>
    </>
  );
  const base = 'flex min-h-40 flex-col justify-between gap-3 rounded-card p-5 shadow-soft';
  if (!to) return <div className={`${base} bg-bisque/50`}>{body}</div>;
  return (
    <Link to={to} className={`${base} bg-bisque transition-transform active:scale-[0.98]`}>
      {body}
    </Link>
  );
}

export default function CabinetPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const orders = useOrders('worker');
  const earnings = useEarnings();
  const unread = useNotifications().data?.unread ?? 0;
  const incoming = orders.data ?? [];
  const newCount = incoming.filter((order) => order.status === 'new').length;
  const acceptedCount = incoming.filter((order) => order.status === 'accepted').length;
  const currency = t('common.currency');

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('cabinet.panelTitle')}</h1>
        {user?.name && <p className="text-mocha">{t('cabinet.greeting', { name: user.name })}</p>}
        {user?.workerName && (
          <p className="text-sm text-mocha">{t('cabinet.workerAs', { name: user.workerName })}</p>
        )}
        {unread > 0 && (
          <p role="status" className="rounded-field bg-pistachio px-4 py-2 font-semibold">
            {t('cabinet.unreadOrders', { count: unread })}
          </p>
        )}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          title={t('cabinet.todayOrders')}
          icon={<ClipboardList className="size-6" />}
          to="/buyurtmalar"
        >
          {t('cabinet.newCount', { count: newCount })}
          <br />
          {t('cabinet.acceptedCount', { count: acceptedCount })}
        </Card>
        <Card title={t('cabinet.monthEarnings')} icon={<Wallet className="size-6" />} to="/daromad">
          <span className="block text-2xl font-bold text-espresso">
            {formatPrice(earnings.data?.monthTotal ?? 0, currency)}
          </span>
          {t('cabinet.afterCommission', { percent: COMMISSION_RATE_PERCENT })}
        </Card>
        <Card title={t('cabinet.myWorks')} icon={<Package className="size-6" />} to="/ishlar">
          {t('cabinet.myWorksText')}
        </Card>
        <Card
          title={t('cabinet.calendar')}
          icon={<CalendarDays className="size-6" />}
          to="/hunarmand/kalendar"
        >
          {t('cabinet.calendarText')}
        </Card>
        <Card title={t('cabinet.materials')} icon={<Wheat className="size-6" />} to="/materiallar">
          {t('cabinet.materialsText')}
        </Card>
      </div>
    </div>
  );
}
