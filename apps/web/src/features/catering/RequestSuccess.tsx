import { m } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { EASE } from './motion';

/** Confirms the enquiry was received; it is not an order and nothing was paid. */
export function RequestSuccess({ onAgain }: { onAgain: () => void }) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <m.div
      role="status"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex flex-col items-start gap-5 py-6"
    >
      <span className="grid size-16 place-items-center rounded-full bg-pistachio/60">
        <svg viewBox="0 0 24 24" className="size-8 text-espresso" aria-hidden="true">
          <m.path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          />
        </svg>
      </span>
      <h3 ref={heading} tabIndex={-1} className="text-2xl font-bold text-espresso outline-none">
        {t('catering.form.successTitle')}
      </h3>
      <p className="max-w-md text-mocha">{t('catering.form.successText')}</p>
      <Button variant="secondary" onClick={onAgain}>
        {t('catering.form.again')}
      </Button>
    </m.div>
  );
}
