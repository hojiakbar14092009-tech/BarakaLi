import { m, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CAPABILITIES, type Capability } from '../../config/capabilities';
import { EASE, IN_VIEW, Reveal, riseIn, staggerChildren } from './motion';

const iconPop: Variants = {
  hidden: { scale: 0.6, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.6, ease: EASE, delay: 0.15 } },
};

const ruleDraw: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 1, ease: EASE } },
};

function CapabilityTile({ capability, index }: { capability: Capability; index: number }) {
  const { t } = useTranslation();
  const Icon = capability.icon;
  return (
    <m.li
      variants={riseIn}
      className="group flex flex-col gap-4 rounded-card bg-sugar p-6 shadow-soft transition-shadow duration-500 hover:shadow-[0_18px_44px_rgb(57_46_38/0.12)]"
    >
      <div className="flex items-center justify-between">
        <m.span
          variants={iconPop}
          className="grid size-12 place-items-center rounded-full bg-bisque/70 text-mocha transition-colors duration-300 group-hover:bg-mocha group-hover:text-sugar"
        >
          <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
        </m.span>
        <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-mocha">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3 className="text-lg font-bold text-espresso">
        {t(`catering.capabilities.items.${capability.key}.title`)}
      </h3>
      <p className="text-mocha">{t(`catering.capabilities.items.${capability.key}.text`)}</p>
    </m.li>
  );
}

export function PlatformCapabilities() {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="capabilities-title"
      className="flex flex-col gap-12 rounded-[2.5rem] bg-bisque/50 px-14 py-16"
    >
      <Reveal className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mocha">
          {t('catering.capabilities.eyebrow')}
        </p>
        <div className="grid grid-cols-2 items-end gap-12">
          <h2
            id="capabilities-title"
            className="text-4xl font-bold leading-tight tracking-tight text-espresso"
          >
            {t('catering.capabilities.title')}
          </h2>
          <p className="text-lg text-mocha">{t('catering.capabilities.lead')}</p>
        </div>
        <m.span
          aria-hidden="true"
          variants={ruleDraw}
          className="mt-4 h-px w-full origin-left bg-wheat"
        />
      </Reveal>
      <m.ul
        className="grid grid-cols-4 gap-5"
        initial="hidden"
        whileInView="visible"
        viewport={{ ...IN_VIEW, amount: 0.2 }}
        variants={staggerChildren()}
      >
        {CAPABILITIES.map((capability, index) => (
          <CapabilityTile key={capability.key} capability={capability} index={index} />
        ))}
      </m.ul>
    </section>
  );
}
