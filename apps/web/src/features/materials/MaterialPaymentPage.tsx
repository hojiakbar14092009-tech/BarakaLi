import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';
import { CardForm } from '../../components/CardForm';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useConfirmMaterialPayment, useMaterialOrder, useStartMaterialPayment } from './api';

export default function MaterialPaymentPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const order = useMaterialOrder(id);
  const start = useStartMaterialPayment(id);
  const confirm = useConfirmMaterialPayment(id);
  const started = useRef(false);
  const awaiting = order.data?.status === 'awaiting_payment';

  useEffect(() => {
    if (awaiting && !started.current) {
      started.current = true;
      start.mutate();
    }
  }, [awaiting, start]);

  if (order.isPending) return <LoadingState />;
  if (order.isError) {
    return (
      <ErrorState message={errorMessage(order.error, t)} onRetry={() => void order.refetch()} />
    );
  }
  const data = order.data;
  const currency = t('common.currency');

  if (!awaiting) {
    const paid = data.status === 'paid' || data.status === 'delivered';
    return (
      <section className="mx-auto max-w-md space-y-4 py-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-mocha" aria-hidden="true" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold">
          {paid ? t('materials.paid') : t('materials.notPayable')}
        </h1>
        {paid && <p className="text-mocha">{t('materials.paidText')}</p>}
        <Link to="/materiallar" className={buttonClasses('primary', 'lg')}>
          {t('materials.backToStore')}
        </Link>
      </section>
    );
  }

  const failure = confirm.error ?? start.error;

  return (
    <section className="mx-auto w-full max-w-md space-y-5 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('payment.title')}</h1>
        <p className="text-mocha">{t('materials.title')}</p>
      </header>
      <div className="space-y-1 rounded-card bg-bisque/60 p-4">
        <p className="text-sm text-mocha">{t('payment.amount')}</p>
        <p className="text-3xl font-bold">{formatPrice(data.total, currency)}</p>
        <ul className="pt-1 text-sm text-mocha">
          {data.items.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
            </li>
          ))}
        </ul>
      </div>
      <CardForm
        submitLabel={t('payment.pay', { amount: formatPrice(data.total, currency) })}
        pending={confirm.isPending}
        disabled={start.isPending || !start.data}
        error={failure ? errorMessage(failure, t) : null}
        onSubmit={(card) => confirm.mutate(card)}
      />
    </section>
  );
}
