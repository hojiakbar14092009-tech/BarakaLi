import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { cardPaymentSchema, type CardPaymentInput } from '@barakali/shared';
import { validationMessage } from '../lib/errors';
import { Button } from './Button';
import { Field } from './Field';

type CardFormValues = z.input<typeof cardPaymentSchema>;

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

interface CardFormProps {
  submitLabel: string;
  pending: boolean;
  /** Disables the button while the payment session is still being created. */
  disabled?: boolean;
  error?: string | null;
  onSubmit: (card: CardPaymentInput) => void;
}

/** The platform's own card form. Values go straight to the confirm call and are never stored. */
export function CardForm({
  submitLabel,
  pending,
  disabled = false,
  error,
  onSubmit,
}: CardFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CardFormValues>({ resolver: zodResolver(cardPaymentSchema) });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(cardPaymentSchema.parse(values)))}
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
      {error && (
        <p role="alert" className="font-medium">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
        {pending ? t('payment.paying') : submitLabel}
      </Button>
      <p className="text-sm text-mocha">{t('payment.secure')}</p>
      <p className="text-sm text-mocha">{t('payment.ledgerNote')}</p>
    </form>
  );
}
