import { Camera, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MAX_ORDER_DESCRIPTION_LENGTH,
  MAX_ORDER_IMAGES,
  MAX_SERVICE_HOURS,
  bookableStarts,
  createServiceOrderSchema,
  tashkentDay,
  tashkentTime,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field, SelectField, TextAreaField } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { dayOf, formatDay } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { resizeImage } from '../../lib/resizeImage';
import { useWorker } from '../catalog/api';
import { useCreateServiceOrder, useUploadOrderImage, useWorkerAvailability } from '../calendar/api';

export default function NewServiceOrderPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workerId = params.get('hunarmand') ?? undefined;
  const worker = useWorker(workerId);
  const availability = useWorkerAvailability(workerId);
  const create = useCreateServiceOrder();
  const upload = useUploadOrderImage();
  const photoInput = useRef<HTMLInputElement>(null);

  const [hours, setHours] = useState(1);
  const [day, setDay] = useState<string | null>(null);
  const [startIso, setStartIso] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const starts = useMemo(() => {
    if (!availability.data) return [];
    const booked = availability.data.booked.map((b) => ({
      start: new Date(b.startTime),
      end: new Date(b.endTime),
    }));
    const now = new Date();
    return availability.data.windows.flatMap((window) =>
      bookableStarts(
        { start: new Date(window.startTime), end: new Date(window.endTime) },
        booked,
        hours,
        now,
      ).map((start) => start.toISOString()),
    );
  }, [availability.data, hours]);

  const days = useMemo(() => [...new Set(starts.map(dayOf))], [starts]);
  const activeDay = day && days.includes(day) ? day : (days[0] ?? null);
  const dayStarts = starts.filter((iso) => dayOf(iso) === activeDay);
  const activeStart = startIso && dayStarts.includes(startIso) ? startIso : null;

  if (!workerId) return <Navigate to="/" replace />;
  if (worker.isPending || availability.isPending) return <LoadingState />;
  if (worker.isError || !worker.data) {
    return <ErrorState message={t('catalog.workerNotFound')} />;
  }

  const today = tashkentDay(new Date());
  const draft = {
    workerId,
    description,
    deadline: deadline || null,
    startTime: activeStart ?? '',
    hours,
    imageUrls: images,
  };
  const parsed = createServiceOrderSchema.safeParse(draft);
  const canSubmit = parsed.success && activeStart !== null && !create.isPending;

  const onPhotos = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(0, MAX_ORDER_IMAGES - images.length)) {
      const result = await upload.mutateAsync(await resizeImage(file)).catch(() => null);
      if (result) setImages((current) => [...current, result.url].slice(0, MAX_ORDER_IMAGES));
    }
    if (photoInput.current) photoInput.current.value = '';
  };

  const submit = () => {
    if (!parsed.success) return;
    create.mutate(parsed.data, {
      onSuccess: (order) => void navigate(`/buyurtmalar/${order.id}`),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('serviceOrder.title')}</h1>
        <p className="text-mocha">{t('serviceOrder.with', { name: worker.data.displayName })}</p>
      </header>

      <section
        aria-labelledby="so-slot"
        className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
      >
        <h2 id="so-slot" className="text-lg font-bold">
          {t('serviceOrder.slotTitle')}
        </h2>
        <SelectField
          label={t('serviceOrder.hours')}
          value={String(hours)}
          onChange={(event) => setHours(Number(event.target.value))}
          options={Array.from({ length: MAX_SERVICE_HOURS }, (_, i) => ({
            value: String(i + 1),
            label: t('serviceOrder.hoursOption', { count: i + 1 }),
          }))}
        />
        {days.length === 0 ? (
          <p role="status" className="rounded-field bg-bisque px-4 py-3">
            {t('serviceOrder.noSlots')}
          </p>
        ) : (
          <>
            <div role="group" aria-label={t('serviceOrder.day')} className="flex flex-wrap gap-2">
              {days.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={value === activeDay}
                  onClick={() => setDay(value)}
                  className={`min-h-12 rounded-full px-4 font-semibold ${
                    value === activeDay ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
                  }`}
                >
                  {formatDay(value, i18n.language)}
                </button>
              ))}
            </div>
            <div role="group" aria-label={t('serviceOrder.time')} className="flex flex-wrap gap-2">
              {dayStarts.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={iso === activeStart}
                  onClick={() => setStartIso(iso)}
                  className={`min-h-12 min-w-20 rounded-field px-3 font-semibold ${
                    iso === activeStart ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
                  }`}
                >
                  {tashkentTime(new Date(iso))}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section
        aria-labelledby="so-brief"
        className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
      >
        <h2 id="so-brief" className="text-lg font-bold">
          {t('serviceOrder.briefTitle')}
        </h2>
        <TextAreaField
          label={t('serviceOrder.description')}
          hint={t('serviceOrder.descriptionHint')}
          rows={4}
          maxLength={MAX_ORDER_DESCRIPTION_LENGTH}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Field
          type="date"
          label={t('serviceOrder.deadline')}
          hint={t('common.optional')}
          min={today}
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
        <div className="space-y-2">
          <p className="font-medium">{t('serviceOrder.photos')}</p>
          <p className="text-sm text-mocha">
            {t('serviceOrder.photosHint', { count: MAX_ORDER_IMAGES })}
          </p>
          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {images.map((url) => (
                <li key={url} className="relative">
                  <img
                    src={url}
                    alt={t('serviceOrder.photoAlt')}
                    width={160}
                    height={160}
                    loading="lazy"
                    className="aspect-square w-full rounded-field object-cover"
                  />
                  <button
                    type="button"
                    aria-label={t('serviceOrder.removePhoto')}
                    onClick={() => setImages((current) => current.filter((u) => u !== url))}
                    className="absolute right-1 top-1 grid size-12 place-items-center rounded-full bg-sugar/95 text-espresso"
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {images.length < MAX_ORDER_IMAGES && (
            <>
              <input
                ref={photoInput}
                id="order-photo-input"
                aria-label={t('serviceOrder.addPhoto')}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => void onPhotos(event.target.files)}
              />
              <Button
                variant="secondary"
                disabled={upload.isPending}
                onClick={() => photoInput.current?.click()}
              >
                <Camera className="size-5" aria-hidden="true" />
                {upload.isPending ? t('serviceOrder.uploading') : t('serviceOrder.addPhoto')}
              </Button>
            </>
          )}
          {upload.isError && <p role="alert">{errorMessage(upload.error, t)}</p>}
        </div>
      </section>

      <section className="space-y-3 rounded-card bg-bisque/60 p-4">
        <p>{t('serviceOrder.noPayment')}</p>
        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
          {t('serviceOrder.submit')}
        </Button>
        {create.isError && <p role="alert">{errorMessage(create.error, t)}</p>}
      </section>
    </div>
  );
}
