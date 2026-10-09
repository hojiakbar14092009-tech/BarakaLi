import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import type { z } from 'zod';
import { cardPaymentSchema } from '@barakali/shared';
import { Button, buttonClasses } from '../../components/Button';
import { Field } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ApiError } from '../../lib/api';
import { errorMessage, validationMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useConfirmPayment, useOrder, useOrders, useStartPayment } from './api';
import { shortId } from './OrdersPage';

type CardForm = z.input<typeof cardPaymentSchema>;

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function PaymentPage() {
  const { t } = useTranslation();
  const { orderId = '' } = useParams();
  const order = useOrder(orderId);
  const start = useStartPayment(orderId);
  const confirm = useConfirmPayment(orderId);
  const unpaid = useOrders('customer');
  const started = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CardForm>({ resolver: zodResolver(cardPaymentSchema) });

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
  const others = (unpaid.data ?? []).filter(
    (item) => item.status === 'awaiting_payment' && item.id !== data.id,
  );

  if (!awaiting) {
    return (
      <section className="mx-auto max-w-md space-y-4 py-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-mocha" aria-hidden="true" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold">
          {data.paymentStatus === 'paid' ? t('payment.success') : t('payment.alreadyPaid')}
        </h1>
        <p className="text-mocha">{t('payment.successText')}</p>
        {others.length > 0 && (
          <p className="rounded-field bg-bisque px-4 py-3">
            {t('payment.nextUnpaid', { count: others.length })}
          </p>
        )}
        <div className="flex flex-col gap-3">
          {others[0] && (
            <Link to={`/tolov/${others[0].id}`} className={buttonClasses('primary', 'lg')}>
              {t('payment.toNext')}
            </Link>
          )}
          <Link to={`/buyurtmalar/${data.id}`} className={buttonClasses('secondary', 'lg')}>
            {t('payment.toOrder')}
          </Link>
        </div>
      </section>
    );
  }

  const failure = confirm.error ?? (start.error instanceof ApiError ? start.error : null);

  return (
    <section className="mx-auto w-full max-w-md space-y-5 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('payment.title')}</h1>
        <p className="text-mocha">{t('orders.orderNo', { id: shortId(data.id) })}</p>
      </header>

      <div className="space-y-1 rounded-card bg-bisque/60 p-4">
        <p className="text-sm text-mocha">{t('payment.amount')}</p>
        <p className="text-3xl font-bold">{formatPrice(data.total, currency)}</p>
        <ul className="pt-1 text-sm text-mocha">
          {data.items.map((item) => (
            <li key={item.id}>
              {item.title} × {item.quantity}
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit((values) => confirm.mutate(cardPaymentSchema.parse(values)))}
        className="space-y-4"
        noValidate
      >
        <Field
          label={t('payment.cardNumber')}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          error={validationMessage(errors.cardNumber?.message, t)}
          {...register('cardNumber', {
            onChange: (event) => setValue('cardNumber', formatCardNumber(event.target.value)),
          })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('payment.expiry')}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder={t('payment.expiryPlaceholder')}
            error={validationMessage(errors.expiry?.message, t)}
            {...register('expiry', {
              onChange: (event) => setValue('expiry', formatExpiry(event.target.value)),
            })}
          />
          <Field
            label={t('payment.cvc')}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={3}
            type="password"
            error={validationMessage(errors.cvc?.message, t)}
            {...register('cvc')}
          />
        </div>
        {failure && (
          <p role="alert" className="font-medium">
            {errorMessage(failure, t)}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={confirm.isPending || start.isPending || !start.data}
        >
          {confirm.isPending
            ? t('payment.paying')
            : t('payment.pay', { amount: formatPrice(data.total, currency) })}
        </Button>
        <p className="text-sm text-mocha">{t('payment.secure')}</p>
        <p className="text-sm text-mocha">{t('payment.ledgerNote')}</p>
      </form>
    </section>
  );
}
