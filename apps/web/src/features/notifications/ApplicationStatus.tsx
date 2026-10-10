import { useTranslation } from 'react-i18next';
import type { NotificationKind } from '@barakali/shared';
import { useAuthStore } from '../../stores/auth';
import { useNotifications } from './api';

const KINDS: NotificationKind[] = [
  'worker_application_received',
  'worker_approved',
  'worker_rejected',
  'worker_suspended',
  'order_new',
];

/**
 * Where the worker's application stands, plus the latest messages about it. A pending or rejected
 * worker is not shown in the catalog and cannot accept orders; this says so in plain words.
 */
export function ApplicationStatus() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const notifications = useNotifications();
  const status = user?.workerStatus;
  if (!user || !status) return null;
  const recent = (notifications.data?.items ?? [])
    .filter((item) => item.kind !== 'order_new' && KINDS.includes(item.kind))
    .slice(0, 3);

  return (
    <section
      aria-labelledby="application-status"
      className="space-y-2 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="application-status" className="font-bold">
        {t('application.title')}
      </h2>
      <p
        role="status"
        className={`rounded-field px-4 py-3 font-medium ${
          status === 'approved' ? 'bg-pistachio' : 'bg-bisque'
        }`}
      >
        {t(`application.status.${status}`)}
      </p>
      {(status === 'rejected' || status === 'suspended') && user.workerRejectReason && (
        <p>
          <span className="text-mocha">{t('application.reason')}: </span>
          {user.workerRejectReason}
        </p>
      )}
      {recent.length > 0 && (
        <ul className="space-y-1 text-sm text-mocha">
          {recent.map((item) => (
            <li key={item.id}>
              {t(`application.notice.${item.kind}`)}
              {(item.kind === 'worker_rejected' || item.kind === 'worker_suspended') && item.detail
                ? `: ${item.detail}`
                : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
