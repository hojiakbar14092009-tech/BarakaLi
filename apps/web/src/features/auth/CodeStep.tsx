import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { PHONE_COUNTRY_PREFIX, SMS_CODE_LENGTH } from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { errorMessage, validationMessage } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth';
import { requestCode, verifyCode } from './api';

const schema = z.object({
  code: z.string().regex(new RegExp(`^\\d{${SMS_CODE_LENGTH}}$`), 'INVALID_CODE'),
  name: z.string().trim().max(80).optional(),
});
type FormValues = z.infer<typeof schema>;

interface CodeStepProps {
  phone: string;
  exposedCode: string | undefined;
  askName: boolean;
  onChangePhone: () => void;
  onResent: (code: string | undefined) => void;
  onVerified: (name: string, hasWorker: boolean) => void;
}

export function CodeStep({
  phone,
  exposedCode,
  askName,
  onChangePhone,
  onResent,
  onVerified,
}: CodeStepProps) {
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const fullPhone = `${PHONE_COUNTRY_PREFIX}${phone}`;
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const verify = useMutation({
    mutationFn: (values: FormValues) =>
      verifyCode({
        phone: fullPhone,
        code: values.code,
        name: values.name && values.name.length >= 2 ? values.name : undefined,
      }),
    onSuccess: (session, values) => {
      setSession(session);
      onVerified(values.name ?? session.user.name ?? '', session.user.workerId !== null);
    },
  });
  const resend = useMutation({
    mutationFn: () => requestCode(fullPhone),
    onSuccess: (response) => onResent(response.code),
  });
  const failure = verify.error ?? resend.error;

  return (
    <form
      onSubmit={handleSubmit((values) => verify.mutate(values))}
      className="space-y-4"
      noValidate
    >
      <p className="text-mocha">{t('auth.codeHint', { phone: fullPhone })}</p>
      {exposedCode && (
        <div className="flex items-center justify-between gap-3 rounded-card bg-bisque p-4">
          <p className="font-semibold">{t('auth.codeShown', { code: exposedCode })}</p>
          <Button variant="primary" onClick={() => setValue('code', exposedCode)}>
            {t('auth.fillCode')}
          </Button>
        </div>
      )}
      <Field
        label={t('auth.codeLabel')}
        error={validationMessage(errors.code?.message, t)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={SMS_CODE_LENGTH}
        {...register('code')}
      />
      {askName && (
        <Field
          label={t('auth.nameLabel')}
          placeholder={t('auth.namePlaceholder')}
          autoComplete="name"
          {...register('name')}
        />
      )}
      {failure && (
        <p role="alert" className="font-medium">
          {errorMessage(failure, t)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={verify.isPending}>
        {verify.isPending ? t('auth.checking') : t('auth.verify')}
      </Button>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onChangePhone}>
          {t('auth.changePhone')}
        </Button>
        <Button variant="ghost" onClick={() => resend.mutate()} disabled={resend.isPending}>
          {t('auth.resend')}
        </Button>
      </div>
    </form>
  );
}
