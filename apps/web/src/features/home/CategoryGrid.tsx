import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CATEGORY_SLUGS } from '@barakali/shared';
import { CategoryIcon } from '../../components/CategoryIcon';

export function CategoryGrid() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="home-categories" className="space-y-3">
      <h2 id="home-categories" className="text-xl font-bold">
        {t('home.categoriesTitle')}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORY_SLUGS.map((slug) => (
          <li key={slug} className="last:col-span-2 sm:last:col-span-1">
            <Link
              to={`/xizmatlar/${slug}`}
              className="flex min-h-32 flex-col items-start justify-between gap-3 rounded-card bg-bisque p-4 text-espresso shadow-soft transition-transform active:scale-[0.98]"
            >
              <span className="grid size-12 place-items-center rounded-field bg-sugar text-mocha">
                <CategoryIcon slug={slug} />
              </span>
              <span className="text-lg font-semibold leading-snug">{t(`categories.${slug}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
