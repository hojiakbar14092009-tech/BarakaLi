import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComplaintsTab, ReviewsTab } from './ModerationTabs';
import { MaterialsTab } from './MaterialsTab';
import { OrdersTab } from './OrdersTab';
import { StatsTab } from './StatsTab';
import { WorkersTab } from './WorkersTab';

const TABS = [
  { id: 'stats', Panel: StatsTab },
  { id: 'workers', Panel: WorkersTab },
  { id: 'orders', Panel: OrdersTab },
  { id: 'reviews', Panel: ReviewsTab },
  { id: 'complaints', Panel: ComplaintsTab },
  { id: 'materials', Panel: MaterialsTab },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface AdminPageProps {
  initialTab?: TabId;
}

export default function AdminPage({ initialTab = 'stats' }: AdminPageProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabId>(initialTab);
  const Panel = TABS.find((tab) => tab.id === active)?.Panel ?? StatsTab;

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
      <div
        role="tablist"
        aria-label={t('admin.sections')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls="admin-panel"
            onClick={() => setActive(tab.id)}
            className={`min-h-12 shrink-0 rounded-full px-5 font-semibold ${
              active === tab.id ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
            }`}
          >
            {t(`admin.tabs.${tab.id}`)}
          </button>
        ))}
      </div>
      <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${active}`}>
        <Panel />
      </div>
    </div>
  );
}
