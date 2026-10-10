import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/Button';

/** Shown to a signed-in user whose role does not allow the page; the server refuses the data too. */
export default function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mocha">403</p>
      <h1 className="text-3xl font-bold">{t('forbidden.title')}</h1>
      <p className="max-w-md text-mocha">{t('forbidden.text')}</p>
      <Link to="/" className={buttonClasses('primary')}>
        {t('forbidden.home')}
      </Link>
    </section>
  );
}
