import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';
import { CateringLanding } from '../catering/CateringLanding';
import { CATALOG_SECTION_ID, useHashScroll } from '../catering/sectionScroll';
import { CategoryGrid } from './CategoryGrid';
import { FeaturedWorkers } from './FeaturedWorkers';
import { HowItWorks } from './HowItWorks';
import { Lessons } from './Lessons';
import { SearchBar } from './SearchBar';

/** Part of the main bundle on purpose: it is the first screen, so no extra chunk round trip. */
export function HomePage() {
  const { t } = useTranslation();
  useHashScroll();
  return (
    <div className="flex flex-col gap-16 lg:gap-28">
      <CateringLanding />
      <section
        id={CATALOG_SECTION_ID}
        aria-label={t('home.catalogLabel')}
        className="scroll-mt-24 space-y-10"
      >
        <div className="space-y-5">
          <SearchBar />
          <CategoryGrid />
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
        </div>
        <FeaturedWorkers />
        <HowItWorks />
        <Lessons />
      </section>
    </div>
  );
}
