import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PHONE_COUNTRY_PREFIX } from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { errorMessage, validationMessage } from '../../lib/errors';
import { requestCode } from './api';

const schema = z.object({ phone: z.string().regex(/^\d{9}$/, 'INVALID_PHONE') });
type FormValues = z.infer<typeof schema>;

interface PhoneStepProps {
  initialPhone: string;
  onSent: (digits: string, exposedCode: string | undefined) => void;
}

export function PhoneStep({ initialPhone, onSent }: PhoneStepProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: initialPhone },
  });
  const mutation = useMutation({
    mutationFn: (digits: string) => requestCode(`${PHONE_COUNTRY_PREFIX}${digits}`),
    onSuccess: (response, digits) => onSent(digits, response.code),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values.phone))}
      className="space-y-4"
      noValidate
    >
      <div className="flex items-end gap-2">
        <span className="mb-0 inline-flex min-h-12 items-center rounded-field bg-bisque px-3 font-semibold">
          {PHONE_COUNTRY_PREFIX}
        </span>
        <div className="flex-1">
          <Field
            label={t('auth.phoneLabel')}
            hint={t('auth.phoneHint')}
            error={validationMessage(errors.phone?.message, t)}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="90 123 45 67"
            maxLength={12}
            {...register('phone', {
              onChange: (event) =>
                setValue('phone', event.target.value.replace(/\D/g, '').slice(0, 9)),
            })}
          />
        </div>
      </div>
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.checking') : t('auth.sendCode')}
      </Button>
    </form>
  );
}
