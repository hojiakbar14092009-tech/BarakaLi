import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OrderDto } from '@barakali/shared';
import { dayOf, formatDay, formatTimeRange } from '../../lib/dates';

/** Slot, brief and reference photos of a service order; renders nothing for product orders. */
export function ServiceDetails({ order }: { order: OrderDto }) {
  const { t, i18n } = useTranslation();
  if (order.type !== 'service' || !order.startTime || !order.endTime) return null;

  return (
    <section
      aria-labelledby="order-service"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="order-service" className="font-bold">
        {t('orders.service.title')}
      </h2>
      <p className="flex items-center gap-3">
        <CalendarClock className="size-6 shrink-0 text-mocha" aria-hidden="true" />
        <span>
          <span className="block font-semibold">
            {formatDay(dayOf(order.startTime), i18n.language)}
          </span>
          <span className="block text-mocha">
            {formatTimeRange(order.startTime, order.endTime)}
          </span>
        </span>
      </p>
      {order.description && (
        <div>
          <p className="text-sm text-mocha">{t('orders.service.description')}</p>
          <p className="whitespace-pre-line break-words">{order.description}</p>
        </div>
      )}
      {order.deadline && (
        <p>
          <span className="text-sm text-mocha">{t('orders.service.deadline')}: </span>
          <span className="font-medium">{formatDay(order.deadline, i18n.language)}</span>
        </p>
      )}
      {order.images.length > 0 && (
        <div>
          <p className="pb-2 text-sm text-mocha">{t('orders.service.photos')}</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {order.images.map((url, index) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('orders.service.openPhoto', { index: index + 1 })}
                  className="block"
                >
                  <img
                    src={url}
                    alt={t('orders.service.photoAlt', { index: index + 1 })}
                    width={200}
                    height={200}
                    loading="lazy"
                    className="aspect-square w-full rounded-field object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
