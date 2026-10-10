import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  QUICK_SLOTS,
  tashkentDay,
  tashkentToDate,
  type AvailabilityWindowDto,
  type QuickSlot,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field, SelectField } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { dayOf, formatDay, formatTimeRange } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useOrders } from '../orders/api';
import { StatusBadge } from '../orders/StatusBadge';
import { useAddWindow, useMyAvailability, useRemoveWindow, useSetHourlyRate } from './api';

const HOUR_MS = 60 * 60 * 1000;
const FIRST_HOUR = 6;
const LAST_HOUR = 24;

const pad = (hour: number): string => `${String(hour % 24).padStart(2, '0')}:00`;
const hourOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    value: String(from + i),
    label: pad(from + i),
  }));

function RateForm({ current }: { current: number | null }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(current === null ? '' : String(current));
  const mutation = useSetHourlyRate();
  const parsed = value.trim() === '' ? null : Number(value);
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed <= 0);

  return (
    <section
      aria-labelledby="cal-rate"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="cal-rate" className="text-lg font-bold">
        {t('calendar.rateTitle')}
      </h2>
      <Field
        label={t('calendar.rateLabel')}
        hint={t('calendar.rateHint')}
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
        error={invalid ? t('validation.invalid') : undefined}
      />
      <Button
        disabled={invalid || mutation.isPending}
        onClick={() => mutation.mutate(parsed)}
        className="w-full sm:w-auto"
      >
        {t('common.save')}
      </Button>
      {mutation.isSuccess && <p role="status">{t('calendar.rateSaved')}</p>}
      {mutation.isError && <p role="alert">{errorMessage(mutation.error, t)}</p>}
    </section>
  );
}

function AddWindowForm() {
  const { t } = useTranslation();
  const today = tashkentDay(new Date());
  const [day, setDay] = useState(today);
  const [startHour, setStartHour] = useState('10');
  const [endHour, setEndHour] = useState('14');
  const mutation = useAddWindow();
  const start = Number(startHour);
  const end = Number(endHour);
  const rangeInvalid = end <= start;

  const applyQuick = (slot: QuickSlot) => {
    setStartHour(String(QUICK_SLOTS[slot].start));
    setEndHour(String(QUICK_SLOTS[slot].end));
  };

  const submit = () => {
    const startTime = tashkentToDate(day, pad(start));
    const endTime = new Date(startTime.getTime() + (end - start) * HOUR_MS);
    mutation.mutate({ startTime: startTime.toISOString(), endTime: endTime.toISOString() });
  };

  return (
    <section
      aria-labelledby="cal-add"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="cal-add" className="text-lg font-bold">
        {t('calendar.addTitle')}
      </h2>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('calendar.quick')}>
        {(Object.keys(QUICK_SLOTS) as QuickSlot[]).map((slot) => (
          <Button key={slot} variant="secondary" onClick={() => applyQuick(slot)}>
            {t(`calendar.slots.${slot}`)}
          </Button>
        ))}
      </div>
      <Field
        type="date"
        label={t('calendar.day')}
        value={day}
        min={today}
        onChange={(event) => setDay(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t('calendar.from')}
          value={startHour}
          onChange={(event) => setStartHour(event.target.value)}
          options={hourOptions(FIRST_HOUR, LAST_HOUR - 1)}
        />
        <SelectField
          label={t('calendar.to')}
          value={endHour}
          onChange={(event) => setEndHour(event.target.value)}
          options={hourOptions(FIRST_HOUR + 1, LAST_HOUR)}
        />
      </div>
      {rangeInvalid && <p role="alert">{t('calendar.rangeInvalid')}</p>}
      <Button
        size="lg"
        className="w-full"
        disabled={rangeInvalid || !day || mutation.isPending}
        onClick={submit}
      >
        {t('calendar.add')}
      </Button>
      {mutation.isSuccess && <p role="status">{t('calendar.added')}</p>}
      {mutation.isError && <p role="alert">{errorMessage(mutation.error, t)}</p>}
    </section>
  );
}

function WindowList({ windows }: { windows: AvailabilityWindowDto[] }) {
  const { t, i18n } = useTranslation();
  const remove = useRemoveWindow();
  const byDay = useMemo(() => {
    const groups = new Map<string, AvailabilityWindowDto[]>();
    for (const window of windows) {
      const key = dayOf(window.startTime);
      groups.set(key, [...(groups.get(key) ?? []), window]);
    }
    return [...groups];
  }, [windows]);

  if (windows.length === 0) {
    return <EmptyState title={t('calendar.empty')} hint={t('calendar.emptyHint')} />;
  }
  return (
    <ul className="space-y-3">
      {byDay.map(([day, items]) => (
        <li key={day} className="space-y-2 rounded-card border border-bisque bg-white/60 p-4">
          <h3 className="font-bold">{formatDay(day, i18n.language)}</h3>
          <ul className="space-y-2">
            {items.map((window) => (
              <li key={window.id} className="flex items-center justify-between gap-3">
                <span className="text-lg">{formatTimeRange(window.startTime, window.endTime)}</span>
                <button
                  type="button"
                  aria-label={t('calendar.remove')}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(window.id)}
                  className="grid size-12 place-items-center rounded-field bg-bisque text-espresso"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/** The worker's own upcoming service bookings, so free windows and taken hours read as one plan. */
function UpcomingBookings() {
  const { t, i18n } = useTranslation();
  const orders = useOrders('worker');
  const upcoming = useMemo(() => {
    const now = Date.now();
    return (orders.data ?? [])
      .filter(
        (order) =>
          order.type === 'service' &&
          order.startTime !== null &&
          new Date(order.endTime ?? 0).getTime() > now &&
          ['new', 'accepted', 'in_progress'].includes(order.status),
      )
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  }, [orders.data]);

  return (
    <section aria-labelledby="cal-bookings" className="space-y-3">
      <h2 id="cal-bookings" className="text-lg font-bold">
        {t('calendar.bookingsTitle')}
      </h2>
      {orders.isPending && <LoadingState />}
      {orders.isError && <p role="alert">{errorMessage(orders.error, t)}</p>}
      {orders.data && upcoming.length === 0 && (
        <p className="rounded-field bg-bisque px-4 py-3">{t('calendar.bookingsEmpty')}</p>
      )}
      <ul className="space-y-2">
        {upcoming.map((order) =>
          order.startTime && order.endTime ? (
            <li key={order.id}>
              <Link
                to={`/buyurtmalar/${order.id}`}
                className="flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-card border border-bisque bg-white/60 p-4"
              >
                <span>
                  <span className="block font-semibold">
                    {formatDay(dayOf(order.startTime), i18n.language)}
                  </span>
                  <span className="block text-mocha">
                    {formatTimeRange(order.startTime, order.endTime)} · {order.counterpart.name}
                  </span>
                </span>
                <StatusBadge status={order.status} />
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const query = useMyAvailability();

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return (
      <ErrorState message={errorMessage(query.error, t)} onRetry={() => void query.refetch()} />
    );
  }
  const { windows, hourlyRate } = query.data;

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('calendar.title')}</h1>
        <p className="text-mocha">{t('calendar.intro')}</p>
        {hourlyRate !== null && (
          <p className="font-semibold">
            {t('calendar.currentRate', { price: formatPrice(hourlyRate, t('common.currency')) })}
          </p>
        )}
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <RateForm key={hourlyRate ?? 'none'} current={hourlyRate} />
          <AddWindowForm />
        </div>
        <section aria-labelledby="cal-list" className="space-y-3">
          <h2 id="cal-list" className="text-lg font-bold">
            {t('calendar.listTitle')}
          </h2>
          <WindowList windows={windows} />
        </section>
        <div className="lg:col-span-2">
          <UpcomingBookings />
        </div>
      </div>
    </div>
  );
}
