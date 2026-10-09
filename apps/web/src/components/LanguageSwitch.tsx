import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import { useLanguageStore } from '../stores/language';

export function LanguageSwitch() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex rounded-field bg-bisque p-0.5"
    >
      {LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setLanguage(code)}
            className={`min-h-12 min-w-12 rounded-[0.875rem] px-2 text-sm font-semibold uppercase transition-colors ${
              active ? 'bg-mocha text-sugar' : 'text-espresso hover:bg-wheat/40'
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
