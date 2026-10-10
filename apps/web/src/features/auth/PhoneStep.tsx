import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PHONE_COUNTRY_PREFIX } from '@barakali/shared';
import { Button } from '../../components/Button';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { errorMessage, validationMessage } from '../../lib/errors';
import { PHONE_LOCAL_DIGITS } from '../../lib/phone';
import { requestCode } from './api';

const schema = z.object({
  phone: z.string().regex(new RegExp(`^\\d{${PHONE_LOCAL_DIGITS}}$`), 'INVALID_PHONE'),
});
type FormValues = z.infer<typeof schema>;

interface PhoneStepProps {
  initialPhone: string;
  onSent: (digits: string, exposedCode: string | undefined) => void;
}

export function PhoneStep({ initialPhone, onSent }: PhoneStepProps) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
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
      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <PhoneInput
            ref={field.ref}
            name={field.name}
            label={t('auth.phoneLabel')}
            hint={t('auth.phoneHint')}
            error={validationMessage(fieldState.error?.message, t)}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
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
