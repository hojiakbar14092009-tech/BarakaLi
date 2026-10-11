import { ChevronDown, ShieldCheck, Store, UserRound, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { buttonClasses } from '../components/Button';

interface RoleEntry {
  key: 'customer' | 'worker' | 'admin';
  to: string;
  icon: LucideIcon;
}

/**
 * Three ways in: a customer signs in (the first SMS code creates the account), a worker goes
 * through the same flow plus the worker application, an administrator uses the admin page.
 */
const ROLES: readonly RoleEntry[] = [
  { key: 'customer', to: '/kirish', icon: UserRound },
  { key: 'worker', to: '/royxatdan-otish?rol=hunarmand', icon: Store },
  { key: 'admin', to: '/admin-kirish', icon: ShieldCheck },
];

/** Disclosure: Escape, a click outside or navigating closes it; focus goes back to the button. */
export function SignInMenu() {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses('primary', 'md', 'gap-1 px-3!')}
      >
        {t('header.signIn')}
        <ChevronDown
          className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="animate-dialog-in absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-card border border-bisque bg-sugar p-2 shadow-soft"
        >
          <p className="px-3 pb-1 pt-2 text-sm font-semibold text-mocha">{t('header.signInAs')}</p>
          <ul className="flex flex-col gap-1">
            {ROLES.map(({ key, to, icon: Icon }) => (
              <li key={key}>
                <Link
                  to={to}
                  className="flex min-h-14 items-center gap-3 rounded-field px-3 py-2 text-espresso hover:bg-bisque/70"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bisque text-mocha">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t(`header.roles.${key}.title`)}</span>
                    <span className="block text-sm text-mocha">
                      {t(`header.roles.${key}.text`)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
