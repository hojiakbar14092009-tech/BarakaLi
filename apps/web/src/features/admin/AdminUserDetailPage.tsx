import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { MAX_REJECT_REASON_LENGTH, MIN_REJECT_REASON_LENGTH } from '@barakali/shared';
import { Button } from '../../components/Button';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { formatPhoneDisplay } from '../../lib/phone';
import { useAdminUser, useBlockUser, useUnblockUser } from './api';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-mocha">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const user = useAdminUser(id);
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const [dialog, setDialog] = useState<'block' | 'unblock' | null>(null);
  const active = dialog === 'block' ? block : unblock;
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  });
  const data = user.data;

  return (
    <section aria-labelledby="user-title" className="space-y-4">
      <Link
        to="/admin/foydalanuvchilar"
        className="inline-flex min-h-12 items-center gap-2 text-mocha hover:text-espresso"
      >
        <ArrowLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        {t('admin.users.back')}
      </Link>
      {user.isPending && <LoadingState />}
      {user.isError && (
        <ErrorState message={errorMessage(user.error, t)} onRetry={() => void user.refetch()} />
      )}
      {data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 id="user-title" className="text-3xl font-bold">
                {data.name ?? t('admin.users.noName')}
              </h1>
              <p className="text-mocha">
                {t(`admin.users.role.${data.role}`)}
                {data.blockedAt ? ` · ${t('admin.users.blocked')}` : ''}
              </p>
            </div>
            {data.blockedAt ? (
              <Button variant="secondary" onClick={() => setDialog('unblock')}>
                {t('admin.users.unblock')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setDialog('block')}
                aria-label={`${t('admin.users.block')}: ${data.name ?? data.phone}`}
              >
                {t('admin.users.block')}
              </Button>
            )}
          </div>
          <dl className="divide-y divide-bisque rounded-card border border-bisque bg-sugar px-5">
            <Row label={t('admin.workers.detail.phone')}>
              <a href={`tel:${data.phone}`} className="underline underline-offset-4">
                {formatPhoneDisplay(data.phone)}
              </a>
            </Row>
            <Row label={t('admin.users.language')}>{data.language.toUpperCase()}</Row>
            <Row label={t('admin.users.orders')}>
              {t('admin.users.ordersCount', { count: data.ordersCount })}
            </Row>
            {data.workerId && (
              <Row label={t('admin.nav.workers')}>
                <Link
                  to={`/admin/hunarmandlar/${data.workerId}`}
                  className="underline underline-offset-4"
                >
                  {t(`admin.workers.status.${data.workerStatus ?? 'pending'}`)}
                </Link>
              </Row>
            )}
            <Row label={t('admin.users.joined')}>{dateFormat.format(new Date(data.createdAt))}</Row>
            {data.blockedAt && (
              <Row label={t('admin.users.blockedAt')}>
                {dateFormat.format(new Date(data.blockedAt))}
                {data.blockReason ? ` · ${data.blockReason}` : ''}
              </Row>
            )}
          </dl>
          {dialog && (
            <ConfirmDialog
              open
              title={t(`admin.users.dialog.${dialog}.title`)}
              description={t(`admin.users.dialog.${dialog}.text`, {
                name: data.name ?? data.phone,
              })}
              confirmLabel={t(`admin.users.dialog.${dialog}.confirm`)}
              reason={
                dialog === 'block'
                  ? {
                      label: t('admin.users.dialog.block.reasonLabel'),
                      hint: t('admin.workers.reasonHint', { min: MIN_REJECT_REASON_LENGTH }),
                      minLength: MIN_REJECT_REASON_LENGTH,
                      maxLength: MAX_REJECT_REASON_LENGTH,
                    }
                  : undefined
              }
              destructive={dialog === 'block'}
              pending={active.isPending}
              error={active.isError ? errorMessage(active.error, t) : undefined}
              onConfirm={(reason) => {
                const done = { onSuccess: () => setDialog(null) };
                if (dialog === 'block') block.mutate({ id: data.id, reason }, done);
                else unblock.mutate(data.id, done);
              }}
              onClose={() => setDialog(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
