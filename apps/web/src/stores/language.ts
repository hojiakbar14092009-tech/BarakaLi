import { create } from 'zustand';
import i18n, { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type Language } from '../i18n';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'ru' || stored === 'uz' ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: readStoredLanguage(),
  setLanguage: (language) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* storage can be blocked: the language still switches for this session */
    }
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
    set({ language });
  },
}));
