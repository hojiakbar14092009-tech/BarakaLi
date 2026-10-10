import { COMMISSION_RATE_PERCENT } from '@barakali/shared';
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

export function WhyBarakaLi() {
  const { t } = useTranslation();
  const [active, setActive] = useState<Audience>('customers');
  const tabs = useRef<Partial<Record<Audience, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextAudience(active, event.key);
    if (!next) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="why-title" className="flex flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="why-title" className="text-3xl font-bold tracking-tight text-espresso lg:text-4xl">
          {t('catering.why.title')} <Logo />
        </h2>
        <p className="text-lg text-mocha">{t('catering.why.lead')}</p>
      </div>
      <div
        role="tablist"
        aria-label={t('catering.why.tabsLabel')}
        className="flex w-full rounded-full bg-bisque/70 p-1 sm:w-fit"
      >
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
              onClick={() => setActive(audience)}
              onKeyDown={onKeyDown}
              className={`min-h-12 flex-1 whitespace-nowrap rounded-full px-2 text-[0.9375rem] font-semibold transition-colors sm:flex-none sm:px-5 sm:text-base ${
                selected ? 'bg-mocha text-sugar shadow-soft' : 'text-espresso hover:bg-sugar/60'
              }`}
            >
              {t(`catering.why.tabs.${audience}`)}
            </button>
          );
        })}
      </div>
      <div id={panelId(active)} role="tabpanel" aria-labelledby={tabId(active)}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS[active].map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex items-start gap-4 rounded-card border border-bisque bg-sugar p-5 shadow-soft"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-bisque/60 text-mocha">
                <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="pt-2.5 text-espresso">
                {t(`catering.why.${active}.${key}`, { percent: COMMISSION_RATE_PERCENT })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
