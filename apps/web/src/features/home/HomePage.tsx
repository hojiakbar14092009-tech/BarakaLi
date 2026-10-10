import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';
import { useIsDesktop } from '../../lib/useIsDesktop';
import { Announcement } from './Announcement';
import { CategoryGrid } from './CategoryGrid';
import { FeaturedWorkers } from './FeaturedWorkers';
import { HowItWorks } from './HowItWorks';
import { Lessons } from './Lessons';
import { SearchBar } from './SearchBar';
import { CATALOG_SECTION_ID, useHashScroll } from './sectionScroll';

// Only desktops get the animated opening, so phones never download its motion code.
const HomeLanding = lazy(() => import('./HomeLanding'));

function BecomeWorkerCard() {
  const { t } = useTranslation();
  return (
    <Link
      to="/royxatdan-otish?rol=hunarmand"
      className="block rounded-card bg-mocha p-5 text-sugar shadow-soft transition-transform active:scale-[0.99]"
    >
      <span className="block text-2xl font-bold">{t('home.becomeWorkerTitle')}</span>
      <span className="mt-1 block text-sugar/90">{t('home.becomeWorkerText')}</span>
      <span className={buttonClasses('secondary', 'lg', 'mt-4 w-full sm:w-auto')}>
        {t('home.becomeWorkerCta')}
      </span>
    </Link>
  );
}

/** Phones and tablets: straight to search and the catalog, the first screen stays light. */
function CompactHome() {
  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <Announcement />
        <SearchBar />
        <CategoryGrid />
        <BecomeWorkerCard />
      </div>
      <FeaturedWorkers />
      <HowItWorks />
      <Lessons />
    </div>
  );
}

/** Desktop: hero and story first, then the same catalog under `#katalog`. */
function DesktopHome() {
  const { t } = useTranslation();
  return (
    <div className="space-y-28">
      <Suspense fallback={<div className="min-h-[calc(100dvh-7rem)]" />}>
        <HomeLanding />
      </Suspense>
      <section
        id={CATALOG_SECTION_ID}
        aria-labelledby="home-catalog-title"
        className="scroll-mt-24 space-y-5"
      >
        <h2 id="home-catalog-title" className="text-3xl font-bold tracking-tight">
          {t('home.catalogTitle')}
        </h2>
        <Announcement />
        <SearchBar />
        <CategoryGrid />
        <FeaturedWorkers />
      </section>
      <HowItWorks />
      <Lessons />
    </div>
  );
}

/** Part of the main bundle on purpose: it is the first screen, so no extra chunk round trip. */
export function HomePage() {
  const isDesktop = useIsDesktop();
  useHashScroll();
  return isDesktop ? <DesktopHome /> : <CompactHome />;
}
