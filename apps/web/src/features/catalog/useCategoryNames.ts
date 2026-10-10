import { useTranslation } from 'react-i18next';
import { CATEGORY_SLUGS } from '@barakali/shared';
import { useCategories } from './api';

export interface CategoryName {
  slug: string;
  name: string;
}

/**
 * Active categories with the name the administrator set, in the current language. Until the list
 * has loaded, the built-in slugs with their translated names keep the layout from jumping.
 */
export function useCategoryNames(): CategoryName[] {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ru' ? 'ru' : 'uz';
  const categories = useCategories();
  if (categories.data) {
    return categories.data.map((category) => ({ slug: category.slug, name: category.name[lang] }));
  }
  return CATEGORY_SLUGS.map((slug) => ({ slug, name: t(`categories.${slug}`) }));
}
