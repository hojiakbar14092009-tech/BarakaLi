import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-3xl font-bold">{t('notFound.title')}</h1>
      <p className="max-w-md text-mocha">{t('notFound.text')}</p>
      <Link to="/" className={buttonClasses('primary')}>
        {t('notFound.home')}
      </Link>
    </section>
  );
}
