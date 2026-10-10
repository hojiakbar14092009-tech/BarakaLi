import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/StateViews';

interface SectionPageProps {
  titleKey: string;
  children?: ReactNode;
}

/** Common frame for one admin section; without children it says the section is not ready yet. */
export function SectionPage({ titleKey, children }: SectionPageProps) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="section-title" className="space-y-4">
      <h1 id="section-title" className="text-3xl font-bold">
        {t(`admin.nav.${titleKey}`)}
      </h1>
      {children ?? <EmptyState title={t('admin.notReady.title')} hint={t('admin.notReady.hint')} />}
    </section>
  );
}
