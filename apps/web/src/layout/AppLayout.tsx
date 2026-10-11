import { ShoppingBasket } from 'lucide-react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Logo } from '../components/Logo';
import { useAuthStore } from '../stores/auth';
import { selectCartCount, useCartStore } from '../stores/cart';
import { NavBar } from './NavBar';
import { SignInMenu } from './SignInMenu';

function CartLink() {
  const { t } = useTranslation();
  const count = useCartStore(selectCartCount);
  return (
    <Link
      to="/savat"
      aria-label={count > 0 ? `${t('header.cart')}: ${count}` : t('header.cart')}
      className="relative grid size-12 place-items-center rounded-field text-mocha hover:bg-bisque/60"
    >
      <ShoppingBasket className="size-6" strokeWidth={1.75} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-mocha px-1 text-xs font-bold text-sugar">
          {count}
        </span>
      )}
    </Link>
  );
}

function Header() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  return (
    <header className="sticky top-0 z-30 border-b border-bisque bg-sugar/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-4 lg:max-w-7xl 2xl:max-w-[96rem]">
        <Link to="/" className="inline-flex min-h-12 items-center text-2xl" aria-label="BarakaLi">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <CartLink />
          {status === 'ready' && !user && <SignInMenu />}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-bisque bg-bisque/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 lg:max-w-7xl 2xl:max-w-[96rem]">
        <Logo className="text-xl" />
        <p className="text-mocha">{t('footer.tagline')}</p>
        <p className="text-sm text-mocha">
          © {new Date().getFullYear()} BarakaLi. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const hasNav = useAuthStore((s) => s.user !== null);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-field focus:bg-mocha focus:px-4 focus:py-3 focus:text-sugar"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 lg:max-w-7xl 2xl:max-w-[96rem]">
        <NavBar />
        <div className={`flex min-w-0 flex-1 flex-col ${hasNav ? 'pb-20 sm:pb-0' : ''}`}>
          <main id="content" className="w-full flex-1 px-4 pt-6">
            <Suspense
              fallback={
                <p className="min-h-dvh py-12 text-center text-mocha">{t('common.loading')}</p>
              }
            >
              <Outlet />
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
