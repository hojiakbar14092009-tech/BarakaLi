import { m, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HeroImage } from './HeroImage';
import { fromRight, staggerChildren } from './motion';

const FLOAT = { duration: 7, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } as const;

/** Main photo, a second photo and the trust note slide in from the right, one after another. */
export function HeroCollage() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const float = (distance: number, duration: number) =>
    reduced ? undefined : { y: [0, distance], transition: { ...FLOAT, duration } };

  return (
    <m.div
      className="relative h-[clamp(30rem,72vh,44rem)]"
      initial="hidden"
      animate="visible"
      variants={staggerChildren(0.3, 0.4)}
    >
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-8 size-[70%] rounded-full bg-[radial-gradient(circle,var(--color-bisque)_0%,transparent_70%)]"
      />
      <m.div
        variants={fromRight}
        className="absolute right-0 top-0 h-[88%] w-[80%] overflow-hidden rounded-[2rem] shadow-soft"
      >
        <HeroImage imageKey="tikuvchilik" eager className="size-full" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent"
        />
      </m.div>

      <m.div variants={fromRight} className="absolute bottom-0 left-0 w-[42%]">
        <m.div animate={float(-10, 7)}>
          <HeroImage
            imageKey="pishiriq"
            sizes="20vw"
            className="aspect-[4/5] rounded-[1.5rem] border-[6px] border-sugar shadow-soft"
          />
        </m.div>
      </m.div>

      <m.div variants={fromRight} className="absolute left-[6%] top-[8%] max-w-[16rem]">
        <m.p
          animate={float(8, 6)}
          className="flex items-start gap-3 rounded-card border border-sugar/60 bg-sugar/90 p-4 text-sm leading-snug text-espresso shadow-soft backdrop-blur"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pistachio/60 text-espresso">
            <ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          {t('home.hero.badge')}
        </m.p>
      </m.div>
    </m.div>
  );
}
