import {
  ArrowDown,
  ClipboardList,
  Rotate3d,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '../../components/Button';
import { CateringImage, SCALE_FROM_HERO } from './CateringImage';
import { CATALOG_SECTION_ID, REQUEST_SECTION_ID, SectionLink } from './sectionScroll';

const POINTS: { key: string; icon: LucideIcon }[] = [
  { key: 'workers', icon: Users },
  { key: 'request', icon: ClipboardList },
  { key: 'view3d', icon: Rotate3d },
  { key: 'safe', icon: ShieldCheck },
];

export function CateringHero() {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="catering-hero-title"
      className="grid items-center gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-12"
    >
      <div className="@container flex flex-col gap-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mocha">
          {t('catering.hero.eyebrow')}
        </p>
        <h1
          id="catering-hero-title"
          // Sized from the column width so the title stays within three lines next to the side nav too.
          className="text-[clamp(1.625rem,6.2cqi,3.75rem)] font-bold leading-[1.12] tracking-tight text-espresso sm:text-[clamp(1.625rem,7.2cqi,3.5rem)] lg:text-[clamp(2rem,7.8cqi,4rem)]"
        >
          {t('catering.hero.title')}
        </h1>
        <ul
          aria-label={t('catering.hero.pointsLabel')}
          className="flex flex-wrap gap-x-5 gap-y-2 text-mocha"
        >
          {POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="inline-flex items-center gap-2">
              <Icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{t(`catering.hero.points.${key}`)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SectionLink sectionId={REQUEST_SECTION_ID} className={buttonClasses('primary', 'lg')}>
            {t('catering.hero.requestCta')}
          </SectionLink>
          <SectionLink
            sectionId={CATALOG_SECTION_ID}
            className={buttonClasses('ghost', 'lg', 'border border-mocha/30')}
          >
            {t('catering.hero.catalogCta')}
            <ArrowDown className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </SectionLink>
        </div>
      </div>
      <div className="relative">
        <CateringImage
          imageKey="tikuvchilik"
          eager
          scaleFrom={SCALE_FROM_HERO}
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="aspect-[4/3] rounded-[1.75rem] shadow-soft lg:aspect-[4/5]"
        />
        <p className="absolute bottom-4 left-4 right-4 flex items-start gap-3 rounded-card bg-sugar/95 p-4 text-sm leading-snug text-espresso shadow-soft sm:right-auto sm:max-w-xs">
          <ShieldCheck
            className="size-6 shrink-0 text-mocha"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {t('catering.hero.badge')}
        </p>
      </div>
    </section>
  );
}
