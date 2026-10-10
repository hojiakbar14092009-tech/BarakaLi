import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from '../catalog/Pagination';
import { useAdminAudit } from './api';

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const audit = useAdminAudit(page);
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tashkent',
  });

  return (
    <section aria-labelledby="audit-title" className="space-y-4">
      <h1 id="audit-title" className="text-3xl font-bold">
        {t('admin.nav.audit')}
      </h1>
      <p className="text-mocha">{t('admin.audit.intro')}</p>
      {audit.isPending && <LoadingState />}
      {audit.isError && (
        <ErrorState message={errorMessage(audit.error, t)} onRetry={() => void audit.refetch()} />
      )}
      {audit.data && audit.data.items.length === 0 && (
        <EmptyState title={t('admin.audit.emptyTitle')} hint={t('admin.audit.emptyHint')} />
      )}
      {audit.data && audit.data.items.length > 0 && (
        <>
          <ol className="divide-y divide-bisque rounded-card border border-bisque bg-sugar">
            {audit.data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                <time dateTime={entry.createdAt} className="shrink-0 text-sm text-mocha sm:w-40">
                  {dateFormat.format(new Date(entry.createdAt))}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t(`admin.audit.actions.${entry.action}`, { defaultValue: entry.action })}
                  </p>
                  <p className="text-sm text-mocha">
                    {entry.adminName ?? t('admin.audit.unknownAdmin')}
                    {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ''}
                    {typeof entry.details.reason === 'string' && entry.details.reason
                      ? ` · ${entry.details.reason}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Pagination
            page={audit.data.page}
            pageSize={audit.data.pageSize}
            total={audit.data.total}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}
