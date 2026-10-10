import {
  CalendarDays,
  Home,
  Receipt,
  Store,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

function useNavItems(): NavItem[] {
  const user = useAuthStore((s) => s.user);
  if (!user) return [];
  const orders: NavItem = { to: '/buyurtmalar', labelKey: 'nav.orders', icon: Receipt };
  const profile: NavItem = { to: '/profil', labelKey: 'nav.profile', icon: UserRound };
  if (user.workerId) {
    return [
      { to: '/hunarmand/panel', labelKey: 'nav.cabinet', icon: Store },
      orders,
      { to: '/hunarmand/kalendar', labelKey: 'nav.calendar', icon: CalendarDays },
      { to: '/daromad', labelKey: 'nav.earnings', icon: Wallet },
      profile,
    ];
  }
  return [{ to: '/', labelKey: 'nav.home', icon: Home, end: true }, orders, profile];
}

export function NavBar() {
  const { t } = useTranslation();
  const items = useNavItems();
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-bisque bg-sugar pb-[env(safe-area-inset-bottom)] sm:sticky sm:inset-x-auto sm:top-16 sm:h-[calc(100dvh-4rem)] sm:w-24 sm:shrink-0 sm:self-start sm:border-r sm:border-t-0 sm:pb-0 lg:w-56"
    >
      <ul className="mx-auto flex max-w-xl justify-around sm:flex-col sm:justify-start sm:gap-1 sm:p-2">
        {items.map(({ to, labelKey, icon: Icon, end }) => (
          <li key={to} className="flex-1 sm:flex-none">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-field px-1 text-xs font-medium sm:min-h-14 sm:flex-row sm:justify-center sm:gap-3 sm:px-3 sm:text-base lg:justify-start ${
                  isActive ? 'bg-bisque text-espresso' : 'text-mocha hover:bg-bisque/50'
                }`
              }
            >
              <Icon className="size-6 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="max-w-full truncate sm:sr-only lg:not-sr-only">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
