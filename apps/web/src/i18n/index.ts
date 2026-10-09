import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGES = ['uz', 'ru'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'uz';
export const LANGUAGE_STORAGE_KEY = 'barakali.language';

type Dictionary = Record<string, unknown>;

const modules = import.meta.glob<Dictionary>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

/** `core.json` keys live at the top level; every other file is nested under its file name. */
function buildDictionary(language: Language): Dictionary {
  const result: Dictionary = {};
  for (const [path, content] of Object.entries(modules)) {
    const match = /\.\/locales\/(\w+)\/([\w-]+)\.json$/.exec(path);
    if (!match || match[1] !== language) continue;
    if (match[2] === 'core') Object.assign(result, content);
    else result[match[2] as string] = content;
  }
  return result;
}

function initialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ru' || stored === 'uz') return stored;
  } catch {
    /* storage unavailable: fall back to the default language */
  }
  return DEFAULT_LANGUAGE;
}

const language = initialLanguage();
if (typeof document !== 'undefined') document.documentElement.lang = language;

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: buildDictionary('uz') },
    ru: { translation: buildDictionary('ru') },
  },
  lng: language,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
