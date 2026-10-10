import { COMMISSION_RATE_PERCENT } from '@barakali/shared';
import { AnimatePresence, m } from 'framer-motion';
import {
  BadgeCheck,
  HandHeart,
  House,
  Inbox,
  ListChecks,
  MessageSquareText,
  Percent,
  Phone,
  Rotate3d,
  ShoppingBasket,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Logo';
import { EASE, Reveal, riseIn, staggerChildren } from './motion';

type Audience = 'customers' | 'workers';

interface Reason {
  key: string;
  icon: LucideIcon;
}

// Only what the platform does today; each line maps to a working feature.
const REASONS: Record<Audience, Reason[]> = {
  customers: [
    { key: 'handmade', icon: HandHeart },
    { key: 'cart', icon: ShoppingBasket },
    { key: 'view3d', icon: Rotate3d },
    { key: 'tracking', icon: ListChecks },
    { key: 'feedback', icon: MessageSquareText },
    { key: 'contact', icon: Phone },
  ],
  workers: [
    { key: 'home', icon: House },
    { key: 'commission', icon: Percent },
    { key: 'incoming', icon: Inbox },
    { key: 'rating', icon: Star },
    { key: 'verified', icon: BadgeCheck },
  ],
};

const AUDIENCES: Audience[] = ['customers', 'workers'];

const tabId = (audience: Audience) => `why-tab-${audience}`;
const panelId = (audience: Audience) => `why-panel-${audience}`;

function nextAudience(current: Audience, key: string): Audience | undefined {
  const index = AUDIENCES.indexOf(current);
  if (key === 'ArrowRight') return AUDIENCES[(index + 1) % AUDIENCES.length];
  if (key === 'ArrowLeft') return AUDIENCES[(index - 1 + AUDIENCES.length) % AUDIENCES.length];
  if (key === 'Home') return AUDIENCES[0];
  if (key === 'End') return AUDIENCES[AUDIENCES.length - 1];
  return undefined;
}

interface TabsProps {
  active: Audience;
  onChange: (audience: Audience) => void;
}

/** Two equal tabs; the Mocha pill slides under the selected one (transform only). */
function AudienceTabs({ active, onChange }: TabsProps) {
  const { t } = useTranslation();
  const tabs = useRef<Partial<Record<Audience, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextAudience(active, event.key);
    if (!next) return;
    event.preventDefault();
    onChange(next);
    tabs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t('catering.why.tabsLabel')}
      className="relative grid w-full max-w-md grid-cols-2 rounded-full bg-bisque/70 p-1"
    >
      <m.span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-mocha shadow-soft"
        animate={{ x: active === 'customers' ? '0%' : '100%' }}
        transition={{ duration: 0.5, ease: EASE }}
      />
      {AUDIENCES.map((audience) => {
        const selected = audience === active;
        return (
          <button
            key={audience}
            ref={(el) => {
              tabs.current[audience] = el;
            }}
            id={tabId(audience)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(audience)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(audience)}
            onKeyDown={onKeyDown}
            className={`relative min-h-12 whitespace-nowrap rounded-full px-5 font-semibold transition-colors duration-300 ${
              selected ? 'text-sugar' : 'text-espresso hover:text-mocha'
            }`}
          >
            {t(`catering.why.tabs.${audience}`)}
          </button>
        );
      })}
    </div>
  );
}

function ReasonCard({ audience, reason }: { audience: Audience; reason: Reason }) {
  const { t } = useTranslation();
  const Icon = reason.icon;
  return (
    <m.li
      variants={riseIn}
      className="group flex items-start gap-4 rounded-card border border-bisque bg-sugar p-6 shadow-soft transition-[box-shadow,border-color] duration-300 hover:border-wheat hover:shadow-[0_18px_40px_rgb(57_46_38/0.12)]"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-bisque/60 text-mocha transition-colors duration-300 group-hover:bg-mocha group-hover:text-sugar">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="pt-2.5 text-espresso">
        {t(`catering.why.${audience}.${reason.key}`, { percent: COMMISSION_RATE_PERCENT })}
      </span>
    </m.li>
  );
}

export function WhyBarakaLi() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Audience>('customers');

  return (
    <section aria-labelledby="why-title" className="grid grid-cols-12 items-start gap-12">
      <Reveal className="col-span-4 flex flex-col gap-6 lg:sticky lg:top-28">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-mocha">
          {t('catering.why.eyebrow')}
        </p>
        <h2
          id="why-title"
          className="text-4xl font-bold leading-tight tracking-tight text-espresso"
        >
          {t('catering.why.title')} <Logo />
        </h2>
        <p className="text-lg text-mocha">{t('catering.why.lead')}</p>
        <AudienceTabs active={active} onChange={setActive} />
      </Reveal>
      <div
        id={panelId(active)}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        className="col-span-8"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.ul
            key={active}
            className="grid grid-cols-2 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25, ease: EASE } }}
            variants={staggerChildren()}
          >
            {REASONS[active].map((reason) => (
              <ReasonCard key={reason.key} audience={active} reason={reason} />
            ))}
          </m.ul>
        </AnimatePresence>
      </div>
    </section>
  );
}
