import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '../../components/ui/Toaster';
import { ADMIN_NAV } from './adminNav';

function AdminNavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-1">
      {ADMIN_NAV.map(({ to, key, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-field px-3 font-medium transition-colors duration-150 ${
                isActive ? 'bg-mocha text-sugar' : 'text-espresso hover:bg-bisque/70'
              }`
            }
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {t(`admin.nav.${key}`)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Phone and tablet: a drawer under the header; focus moves in, Esc closes, focus returns. */
function AdminDrawer() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>('a')?.focus();
    else if (document.activeElement && panel.current?.contains(document.activeElement)) {
      trigger.current?.focus();
    }
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const focusable = panel.current.querySelectorAll<HTMLElement>('a, button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="lg:hidden">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="admin-drawer"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-12 items-center gap-2 rounded-field bg-bisque px-4 font-semibold text-espresso"
      >
        {open ? (
          <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Menu className="size-5" strokeWidth={1.5} aria-hidden="true" />
        )}
        {t('admin.nav.menu')}
      </button>
      {open && (
        <div
          id="admin-drawer"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.nav.menu')}
          onKeyDown={onKeyDown}
          className="mt-3 rounded-card border border-bisque bg-sugar p-2 shadow-soft"
        >
          <nav aria-label={t('admin.nav.label')}>
            <AdminNavList onNavigate={() => setOpen(false)} />
          </nav>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-field text-mocha hover:bg-bisque/60"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6 pb-6 lg:flex-row lg:gap-8">
      <aside className="hidden w-60 shrink-0 lg:block">
        <nav
          aria-label={t('admin.nav.label')}
          className="sticky top-24 rounded-card border border-bisque bg-sugar p-2 shadow-soft"
        >
          <AdminNavList />
        </nav>
      </aside>
      <AdminDrawer />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
