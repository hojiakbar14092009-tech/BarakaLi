import { m, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Logo';
import { EASE, IN_VIEW, Reveal, riseIn, staggerChildren } from './motion';

const lineGrow: Variants = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 1.4, ease: EASE } },
};

function Statement({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <m.li variants={riseIn} className="space-y-2">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mocha">{label}</p>
      <p className="text-2xl leading-relaxed text-espresso">{children}</p>
    </m.li>
  );
}

/** The problem in two sentences and the answer in one; each line surfaces as it scrolls in. */
export function WhyBarakaLi() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="home-why-title" className="grid grid-cols-12 items-start gap-12">
      <Reveal className="col-span-4 flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mocha">
          {t('home.why.eyebrow')}
        </p>
        <h2
          id="home-why-title"
          className="text-4xl font-bold leading-tight tracking-tight text-espresso"
        >
          {t('home.why.title')} <Logo />?
        </h2>
      </Reveal>
      <div className="relative col-span-8 pl-10">
        <m.span
          aria-hidden="true"
          initial="hidden"
          whileInView="visible"
          viewport={IN_VIEW}
          variants={lineGrow}
          className="absolute inset-y-0 left-0 w-px origin-top bg-wheat"
        />
        <m.ul
          className="space-y-10"
          initial="hidden"
          whileInView="visible"
          viewport={IN_VIEW}
          variants={staggerChildren(0.2, 0.35)}
        >
          <Statement label={t('home.why.problemLabel')}>{t('home.why.problem1')}</Statement>
          <Statement label={t('home.why.problemLabel')}>{t('home.why.problem2')}</Statement>
          <Statement label={t('home.why.solutionLabel')}>
            <Logo /> {t('home.why.solution')}
          </Statement>
        </m.ul>
      </div>
    </section>
  );
}
