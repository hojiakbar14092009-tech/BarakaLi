import { Box, Image as ImageIcon, Rotate3d } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

export type GalleryTab = 'photos' | 'model' | 'rotate';

const ICONS = { photos: ImageIcon, model: Box, rotate: Rotate3d } as const;
const LABELS = {
  photos: 'product.tabPhotos',
  model: 'product.tab3d',
  rotate: 'product.tabRotate',
} as const;

interface GalleryTabsProps {
  tabs: GalleryTab[];
  active: GalleryTab;
  onSelect: (tab: GalleryTab) => void;
  panelId: string;
}

/** WAI-ARIA tabs: arrow keys, Home and End move between tabs; only the active one is tabbable. */
export function GalleryTabs({ tabs, active, onSelect, panelId }: GalleryTabsProps) {
  const { t } = useTranslation();
  const refs = useRef<Partial<Record<GalleryTab, HTMLButtonElement | null>>>({});

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.indexOf(active);
    const target = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[event.key];
    if (!target) return;
    event.preventDefault();
    onSelect(target);
    refs.current[target]?.focus();
  };

  return (
    <div role="tablist" aria-label={t('product.gallery')} className="flex gap-2" onKeyDown={move}>
      {tabs.map((tab) => {
        const Icon = ICONS[tab];
        const selected = tab === active;
        return (
          <button
            key={tab}
            ref={(element) => {
              refs.current[tab] = element;
            }}
            type="button"
            role="tab"
            id={`gallery-tab-${tab}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab)}
            className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-semibold ${
              selected ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {t(LABELS[tab])}
          </button>
        );
      })}
    </div>
  );
}
