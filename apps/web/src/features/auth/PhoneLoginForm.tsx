import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  MAX_NAME_LENGTH,
  PHONE_COUNTRY_PREFIX,
  type AuthResponse,
  type LoginInput,
  type UserDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { errorMessage, validationMessage } from '../../lib/errors';
import { PHONE_LOCAL_DIGITS } from '../../lib/phone';
import { useAuthStore } from '../../stores/auth';
import { login } from './api';

const schema = z.object({
  phone: z.string().regex(new RegExp(`^\\d{${PHONE_LOCAL_DIGITS}}$`), 'INVALID_PHONE'),
  name: z.string().trim().max(MAX_NAME_LENGTH).optional(),
});
type FormValues = z.infer<typeof schema>;

interface PhoneLoginFormProps {
  /** Shows the optional name field (sign-up and the worker flow). */
  askName: boolean;
  onSignedIn: (user: UserDto) => void;
  /** Defaults to the general sign-in; /admin-kirish passes the admin one. */
  submit?: (input: LoginInput) => Promise<AuthResponse>;
}

/** Phone number (and a name when signing up) is all it takes: there is no SMS code step. */
export function PhoneLoginForm({ askName, onSignedIn, submit = login }: PhoneLoginFormProps) {
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const { control, register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { phone: '', name: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const name = values.name?.trim();
      return submit({
        phone: `${PHONE_COUNTRY_PREFIX}${values.phone}`,
        ...(name && name.length >= 2 ? { name } : {}),
      });
    },
    onSuccess: (session) => {
      setSession(session);
      onSignedIn(session.user);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
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
      {askName && (
        <Field
          label={t('auth.nameLabel')}
          placeholder={t('auth.namePlaceholder')}
          autoComplete="name"
          {...register('name')}
        />
      )}
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.checking') : t('auth.submit')}
      </Button>
    </form>
  );
}
