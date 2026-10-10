import { m, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CateringImage, SCALE_FROM_HERO } from './CateringImage';
import { EASE } from './motion';

const FLOAT = { duration: 7, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } as const;

/** Main photo opens from a soft inset; a second photo and the trust note drift gently. */
export function HeroCollage() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  return (
    <div className="relative h-[clamp(30rem,72vh,44rem)]">
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-8 size-[70%] rounded-full bg-[radial-gradient(circle,var(--color-bisque)_0%,transparent_70%)]"
      />
      <m.div
        className="absolute right-0 top-0 h-[88%] w-[80%] overflow-hidden rounded-[2rem] shadow-soft"
        initial={reduced ? false : { clipPath: 'inset(14% 10% 14% 10% round 2rem)', opacity: 0 }}
        animate={{ clipPath: 'inset(0% 0% 0% 0% round 2rem)', opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.1 }}
      >
        <CateringImage
          imageKey="tikuvchilik"
          eager
          scaleFrom={SCALE_FROM_HERO}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="size-full"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent"
        />
      </m.div>

      <m.div
        className="absolute bottom-0 left-0 w-[42%]"
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
      >
        <m.div animate={{ y: [0, -10] }} transition={FLOAT}>
          <CateringImage
            imageKey="pishiriq"
            sizes="20vw"
            className="aspect-[4/5] rounded-[1.5rem] border-[6px] border-sugar shadow-soft"
          />
        </m.div>
      </m.div>

      <m.div
        className="absolute left-[6%] top-[8%] max-w-[16rem]"
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
      >
        <m.p
          animate={{ y: [0, 8] }}
          transition={{ ...FLOAT, duration: 6 }}
          className="flex items-start gap-3 rounded-card border border-sugar/60 bg-sugar/90 p-4 text-sm leading-snug text-espresso shadow-soft backdrop-blur"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pistachio/60 text-espresso">
            <ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          {t('catering.hero.badge')}
        </m.p>
      </m.div>
    </div>
  );
}
