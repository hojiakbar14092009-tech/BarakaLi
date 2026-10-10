import {
  CATERING_MAX_GUESTS,
  CATERING_OTHER_SERVICE_ID,
  CATERING_SERVICE_TYPES,
  PHONE_COUNTRY_PREFIX,
} from '@barakali/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Field, SelectField, TextAreaField } from '../../components/Field';
import { errorMessage, validationMessage } from '../../lib/errors';
import { useLanguageStore } from '../../stores/language';
import { createCateringRequest } from './api';
import {
  EMPTY_REQUEST,
  firstBookableDate,
  requestFormSchema,
  toRequestPayload,
  type RequestFormValues,
} from './requestForm';
import { useRequestSelection } from './requestSelection';
import { serviceTitle } from './serviceTypes';

function useServiceOptions() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  return [
    { value: '', label: t('catering.form.servicePlaceholder') },
    ...CATERING_SERVICE_TYPES.map((type) => ({
      value: type.id,
      label: serviceTitle(type, language),
    })),
    { value: CATERING_OTHER_SERVICE_ID, label: t('catering.form.serviceOther') },
  ];
}

export function CateringRequestForm({ onSent }: { onSent: () => void }) {
  const { t } = useTranslation();
  const picked = useRequestSelection((s) => s.serviceTypeId);
  const serviceOptions = useServiceOptions();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { ...EMPTY_REQUEST, serviceTypeId: picked ?? '' },
  });
  const mutation = useMutation({
    mutationFn: (values: RequestFormValues) => createCateringRequest(toRequestPayload(values)),
    onSuccess: onSent,
  });

  useEffect(() => {
    if (picked) setValue('serviceTypeId', picked, { shouldValidate: true });
  }, [picked, setValue]);

  const message = (code?: string) =>
    code === 'GUESTS_MAX'
      ? t('validation.GUESTS_MAX', { max: CATERING_MAX_GUESTS })
      : validationMessage(code, t);

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      aria-labelledby="request-title"
      className="grid grid-cols-2 gap-x-5 gap-y-5"
    >
      <Field
        label={t('catering.form.name')}
        autoComplete="name"
        error={message(errors.name?.message)}
        {...register('name')}
      />
      <div className="flex items-end gap-2">
        <span className="inline-flex min-h-12 items-center rounded-field bg-bisque px-3 font-semibold text-espresso">
          {PHONE_COUNTRY_PREFIX}
        </span>
        <div className="flex-1">
          <Field
            label={t('catering.form.phone')}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="90 123 45 67"
            maxLength={12}
            error={message(errors.phone?.message)}
            {...register('phone', {
              onChange: (event) =>
                setValue('phone', event.target.value.replace(/\D/g, '').slice(0, 9)),
            })}
          />
        </div>
      </div>
      <div className="col-span-2">
        <SelectField
          label={t('catering.form.service')}
          options={serviceOptions}
          error={message(errors.serviceTypeId?.message)}
          {...register('serviceTypeId')}
        />
      </div>
      <Field
        type="date"
        label={t('catering.form.date')}
        min={firstBookableDate()}
        error={message(errors.eventDate?.message)}
        {...register('eventDate')}
      />
      <Field
        type="number"
        inputMode="numeric"
        min={1}
        label={t('catering.form.guests')}
        error={message(errors.guestsCount?.message)}
        {...register('guestsCount', { valueAsNumber: true })}
      />
      <div className="col-span-2">
        <TextAreaField
          rows={4}
          label={t('catering.form.note')}
          hint={t('catering.form.noteHint')}
          error={message(errors.note?.message)}
          {...register('note')}
        />
      </div>
      {mutation.isError && (
        <p role="alert" className="col-span-2 font-medium text-espresso">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <div className="col-span-2 flex items-center justify-between gap-6">
        <p className="text-sm text-mocha">{t('catering.form.privacy')}</p>
        <Button
          type="submit"
          size="lg"
          className="group shrink-0 px-8"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t('catering.form.sending') : t('catering.form.submit')}
          <ArrowRight
            className="size-5 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Button>
      </div>
    </form>
  );
}
