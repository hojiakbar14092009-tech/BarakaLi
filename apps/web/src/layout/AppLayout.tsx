import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Logo } from '../components/Logo';
import { buttonClasses } from '../components/Button';

function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 border-b border-bisque bg-sugar/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="inline-flex min-h-12 items-center text-2xl" aria-label="BarakaLi">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link to="/kirish" className={buttonClasses('primary', 'md', 'px-4')}>
            {t('header.signIn')}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-bisque bg-bisque/40 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8">
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
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-field focus:bg-mocha focus:px-4 focus:py-3 focus:text-sugar"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">
        <Suspense fallback={<p className="py-12 text-center text-mocha">{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
