import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPhoneDisplay } from '../../lib/phone';
import { Pagination } from '../catalog/Pagination';
import { useAdminUsers } from './api';
import { SectionPage } from './SectionPage';

const FILTERS = ['', 'blocked', 'admin', 'worker', 'customer'] as const;

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const users = useAdminUsers(page, filter || undefined, q || undefined);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setQ(draft.trim());
    setPage(1);
  };

  return (
    <SectionPage titleKey="users">
      <div className="space-y-4">
        <div role="group" aria-label={t('admin.filter')} className="flex flex-wrap gap-2">
          {FILTERS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`min-h-12 rounded-full px-4 font-semibold ${
                filter === value ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
              }`}
            >
              {value ? t(`admin.users.filter.${value}`) : t('common.all')}
            </button>
          ))}
        </div>
        <form role="search" onSubmit={onSearch} className="flex gap-2">
          <label className="sr-only" htmlFor="user-search">
            {t('admin.users.search')}
          </label>
          <input
            id="user-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('admin.workers.search.placeholder')}
            className="min-h-12 w-full rounded-field border border-wheat bg-white/70 px-4 text-base text-espresso placeholder:text-mocha/70"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            {t('admin.workers.search.button')}
          </Button>
        </form>
        {users.isPending && <LoadingState />}
        {users.isError && (
          <ErrorState message={errorMessage(users.error, t)} onRetry={() => void users.refetch()} />
        )}
        {users.data && users.data.items.length === 0 && (
          <EmptyState title={t('admin.users.empty')} />
        )}
        <ul className="space-y-2">
          {users.data?.items.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  <Link
                    to={`/admin/foydalanuvchilar/${user.id}`}
                    className="inline-flex min-h-12 items-center underline-offset-4 hover:underline"
                  >
                    {user.name ?? t('admin.users.noName')}
                  </Link>
                </p>
                <p className="text-sm text-mocha">
                  {formatPhoneDisplay(user.phone)} · {t(`admin.users.role.${user.role}`)} ·{' '}
                  {t('admin.users.ordersCount', { count: user.ordersCount })}
                </p>
              </div>
              {user.blockedAt && (
                <span className="rounded-full bg-espresso px-3 py-1 text-sm font-semibold text-sugar">
                  {t('admin.users.blocked')}
                </span>
              )}
            </li>
          ))}
        </ul>
        {users.data && (
          <Pagination
            page={users.data.page}
            pageSize={users.data.pageSize}
            total={users.data.total}
            onChange={setPage}
          />
        )}
      </div>
    </SectionPage>
  );
}
