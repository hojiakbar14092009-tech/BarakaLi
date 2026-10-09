import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { becomeWorkerSchema, type BecomeWorkerInput } from '@barakali/shared';
import { Button } from '../../components/Button';
import { SelectField, Field, TextAreaField } from '../../components/Field';
import { LoadingState } from '../../components/StateViews';
import { errorMessage, validationMessage } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth';
import { useCategories } from '../catalog/api';
import { becomeWorker } from './api';

interface WorkerStepProps {
  defaultName: string;
  onDone: () => void;
}

export function WorkerStep({ defaultName, onDone }: WorkerStepProps) {
  const { t, i18n } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const categories = useCategories();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BecomeWorkerInput>({
    resolver: zodResolver(becomeWorkerSchema),
    defaultValues: { displayName: defaultName, categoryId: '', bio: '' },
  });
  const mutation = useMutation({
    mutationFn: becomeWorker,
    onSuccess: (user) => {
      setUser(user);
      onDone();
    },
  });

  if (categories.isPending) return <LoadingState />;
  const options = [
    { value: '', label: '—' },
    ...(categories.data ?? []).map((category) => ({
      value: category.id,
      label: i18n.language === 'ru' ? category.name.ru : category.name.uz,
    })),
  ];

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
      noValidate
    >
      <Field
        label={t('auth.displayNameLabel')}
        autoComplete="name"
        error={errors.displayName ? t('auth.required') : undefined}
        {...register('displayName')}
      />
      <SelectField
        label={t('auth.categoryLabel')}
        options={options}
        error={errors.categoryId ? validationMessage('invalid', t) : undefined}
        {...register('categoryId')}
      />
      <TextAreaField
        label={t('auth.bioLabel')}
        placeholder={t('auth.bioPlaceholder')}
        {...register('bio')}
      />
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {t('auth.createProfile')}
      </Button>
    </form>
  );
}
