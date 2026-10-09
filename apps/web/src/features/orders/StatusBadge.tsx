import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@barakali/shared';

const DONE: readonly OrderStatus[] = ['accepted', 'in_progress', 'ready', 'delivered'];

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const tone = DONE.includes(status) ? 'bg-pistachio' : 'bg-bisque';
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold text-espresso ${tone}`}
    >
      {t(`orders.status.${status}`)}
    </span>
  );
}
