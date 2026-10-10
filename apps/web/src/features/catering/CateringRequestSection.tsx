import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CateringImage } from './CateringImage';
import { CateringRequestForm } from './CateringRequestForm';
import { EASE, Reveal } from './motion';
import { RequestSuccess } from './RequestSuccess';
import { REQUEST_SECTION_ID } from './sectionScroll';

const STEPS = ['send', 'call', 'agree'] as const;

function RequestIntro() {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-[2rem] p-10 text-sugar">
      <CateringImage imageKey="dizayn" sizes="35vw" className="absolute inset-0" />
      <div aria-hidden="true" className="absolute inset-0 bg-espresso/80" />
      <div className="relative flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sugar/85">
          {t('catering.form.eyebrow')}
        </p>
        <h2 id="request-title" className="text-4xl font-bold leading-tight tracking-tight">
          {t('catering.form.title')}
        </h2>
        <p className="text-lg text-sugar/90">{t('catering.form.lead')}</p>
      </div>
      <ol className="relative flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-sugar/40 text-sm font-semibold tabular-nums">
              {index + 1}
            </span>
            {t(`catering.form.steps.${step}`)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CateringRequestSection() {
  const [sent, setSent] = useState(false);
  return (
    <section
      id={REQUEST_SECTION_ID}
      aria-labelledby="request-title"
      className="grid scroll-mt-24 grid-cols-[1fr_1.35fr] gap-8"
    >
      <Reveal className="flex">
        <RequestIntro />
      </Reveal>
      <Reveal delay={0.1} className="rounded-[2rem] border border-bisque bg-sugar p-10 shadow-soft">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={sent ? 'sent' : 'form'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
          >
            {sent ? (
              <RequestSuccess onAgain={() => setSent(false)} />
            ) : (
              <CateringRequestForm onSent={() => setSent(true)} />
            )}
          </m.div>
        </AnimatePresence>
      </Reveal>
    </section>
  );
}
