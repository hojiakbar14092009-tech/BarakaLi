import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import { useLanguageStore } from '../stores/language';

const OPTION = 'min-h-12 min-w-12 rounded-[0.875rem] px-2 text-sm font-semibold uppercase';

/** Both languages side by side; on phones a single toggle to the other one, to keep the header in one row. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const other = LANGUAGES.find((code) => code !== language) ?? language;

  return (
    <>
      <button
        type="button"
        aria-label={`${t('common.language')}: ${other.toUpperCase()}`}
        onClick={() => setLanguage(other)}
        className={`${OPTION} bg-bisque text-espresso sm:hidden`}
      >
        {other}
      </button>
      <div
        role="group"
        aria-label={t('common.language')}
        className="hidden rounded-field bg-bisque p-0.5 sm:flex"
      >
        {LANGUAGES.map((code) => {
          const active = code === language;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              onClick={() => setLanguage(code)}
              className={`${OPTION} transition-colors ${
                active ? 'bg-mocha text-sugar' : 'text-espresso hover:bg-wheat/40'
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>
    </>
  );
}
