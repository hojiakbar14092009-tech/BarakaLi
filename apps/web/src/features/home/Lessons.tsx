import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';

const LESSONS = ['income', 'pricing', 'clients'] as const;

export function Lessons() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="home-lessons" className="space-y-3">
      <h2 id="home-lessons" className="text-xl font-bold">
        {t('home.lessonsTitle')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {LESSONS.map((lesson) => (
          <li key={lesson} className="rounded-card border border-bisque bg-white/60 p-4">
            <BookOpen className="mb-2 size-6 text-mocha" aria-hidden="true" strokeWidth={1.5} />
            <h3 className="font-semibold">{t(`home.lessons.${lesson}.title`)}</h3>
            <p className="text-mocha">{t(`home.lessons.${lesson}.text`)}</p>
          </li>
        ))}
      </ul>
      <Link to="/darslar" className={buttonClasses('secondary', 'md')}>
        {t('home.lessonsAll')}
      </Link>
    </section>
  );
}
