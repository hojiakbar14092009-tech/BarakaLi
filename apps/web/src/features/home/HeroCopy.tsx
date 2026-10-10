import { m, type Variants } from 'framer-motion';
import { ArrowDown, ArrowRight, Rotate3d, ShieldCheck, ShoppingBasket, Users } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../../components/Button';
import { EASE, riseIn, staggerChildren } from './motion';
import { CATALOG_SECTION_ID, SectionLink } from './sectionScroll';

export const HERO_TITLE_ID = 'home-hero-title';

const POINTS = [
  { key: 'workers', icon: Users },
  { key: 'order', icon: ShoppingBasket },
  { key: 'view3d', icon: Rotate3d },
  { key: 'safe', icon: ShieldCheck },
] as const;

const wordUp: Variants = {
  hidden: { y: '110%', opacity: 0 },
  visible: { y: '0%', opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

const lineDraw: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
};

/** Title words rise from behind a mask one after another; the text itself stays plain. */
function MaskedTitle({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <m.h1
      id={HERO_TITLE_ID}
      variants={staggerChildren(0.2, 0.12)}
      // Sized from the column width so the title stays within three lines next to the side nav too.
      className="text-[clamp(2.25rem,8.6cqi,4.75rem)] font-bold leading-[1.08] tracking-[-0.02em] text-espresso"
    >
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
            <m.span className="inline-block" variants={wordUp}>
              {word}
            </m.span>
          </span>
          {index < words.length - 1 && ' '}
        </Fragment>
      ))}
    </m.h1>
  );
}

export function HeroCopy() {
  const { t } = useTranslation();
  return (
    <m.div
      className="@container flex flex-col gap-8"
      initial="hidden"
      animate="visible"
      variants={staggerChildren(0.1, 0.14)}
    >
      <m.p
        variants={riseIn}
        className="flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.22em] text-mocha"
      >
        <m.span variants={lineDraw} className="h-px w-12 origin-left bg-mocha" aria-hidden="true" />
        {t('home.hero.eyebrow')}
      </m.p>
      <MaskedTitle text={t('home.hero.title')} />
      <m.ul
        variants={staggerChildren(0.9, 0.14)}
        aria-label={t('home.hero.pointsLabel')}
        className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-espresso"
      >
        {POINTS.map(({ key, icon: Icon }) => (
          <m.li key={key} variants={riseIn} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-wheat/70 bg-sugar text-mocha">
              <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            {t(`home.hero.points.${key}`)}
          </m.li>
        ))}
      </m.ul>
      <m.div variants={riseIn} className="flex flex-wrap gap-3">
        <Link
          to="/royxatdan-otish?rol=hunarmand"
          className={buttonClasses('primary', 'lg', 'group px-7 shadow-soft')}
        >
          {t('home.hero.primaryCta')}
          <ArrowRight
            className="size-5 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
        <SectionLink
          sectionId={CATALOG_SECTION_ID}
          className={buttonClasses('ghost', 'lg', 'group border border-mocha/30 px-7')}
        >
          {t('home.hero.catalogCta')}
          <ArrowDown
            className="size-5 transition-transform duration-300 group-hover:translate-y-0.5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </SectionLink>
      </m.div>
    </m.div>
  );
}
