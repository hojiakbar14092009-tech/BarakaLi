import { CATERING_SERVICE_TYPES } from '@barakali/shared';
import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '../../components/Button';
import { useLanguageStore } from '../../stores/language';
import { CateringImage } from './CateringImage';
import { IN_VIEW, Reveal, riseIn, staggerChildren } from './motion';
import { useRequestSelection } from './requestSelection';
import { REQUEST_SECTION_ID, SectionLink } from './sectionScroll';
import { SERVICE_ICONS, serviceDescription, serviceTitle, type ServiceType } from './serviceTypes';

function ServiceCard({ type }: { type: ServiceType }) {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const select = useRequestSelection((s) => s.select);
  const Icon = SERVICE_ICONS[type.icon];
  const title = serviceTitle(type, language);
  return (
    <m.li
      variants={riseIn}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-bisque bg-sugar shadow-soft transition-[box-shadow,border-color] duration-500 hover:border-wheat hover:shadow-[0_24px_60px_rgb(57_46_38/0.14)]"
    >
      <div className="relative">
        <CateringImage
          imageKey={type.imageKey}
          sizes="(min-width: 1536px) 40vw, 45vw"
          className="aspect-[16/10]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-espresso/35 via-espresso/0 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span className="absolute left-5 top-5 grid size-14 place-items-center rounded-full bg-sugar/95 text-mocha shadow-soft backdrop-blur">
          <Icon className="size-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-7">
        <h3 className="text-2xl font-bold tracking-tight text-espresso">{title}</h3>
        <p className="line-clamp-2 text-mocha">{serviceDescription(type, language)}</p>
        <SectionLink
          sectionId={REQUEST_SECTION_ID}
          onNavigate={() => select(type.id)}
          ariaLabel={t('catering.services.ctaLabel', { service: title })}
          className={buttonClasses('secondary', 'md', 'group/cta mt-auto self-start px-6')}
        >
          {t('catering.services.cta')}
          <ArrowRight
            className="size-5 transition-transform duration-300 group-hover/cta:translate-x-1"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </SectionLink>
      </div>
    </m.li>
  );
}

export function ServiceTypesGrid() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="services-title" className="flex flex-col gap-12">
      <Reveal className="grid grid-cols-2 items-end gap-12">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mocha">
            {t('catering.services.eyebrow')}
          </p>
          <h2
            id="services-title"
            className="text-4xl font-bold leading-tight tracking-tight text-espresso"
          >
            {t('catering.services.title')}
          </h2>
        </div>
        <p className="text-lg text-mocha">{t('catering.services.lead')}</p>
      </Reveal>
      <m.ul
        className="grid grid-cols-2 gap-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ ...IN_VIEW, amount: 0.15 }}
        variants={staggerChildren()}
      >
        {CATERING_SERVICE_TYPES.map((type) => (
          <ServiceCard key={type.id} type={type} />
        ))}
      </m.ul>
    </section>
  );
}
