import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';
import { MotionFade } from '../../components/MotionFade';
import { CategoryGrid } from './CategoryGrid';
import { FeaturedWorkers } from './FeaturedWorkers';
import { HowItWorks } from './HowItWorks';
import { Lessons } from './Lessons';
import { SearchBar } from './SearchBar';

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-10">
      <MotionFade className="space-y-5">
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
      </MotionFade>
      <FeaturedWorkers />
      <HowItWorks />
      <Lessons />
    </div>
  );
}
