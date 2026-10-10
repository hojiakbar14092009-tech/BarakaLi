import { useTranslation } from 'react-i18next';
import { MaterialsTab } from './MaterialsTab';
import { ComplaintsTab, ReviewsTab } from './ModerationTabs';
import { OrdersTab } from './OrdersTab';
import { SectionPage } from './SectionPage';
import { WorkersTab } from './WorkersTab';

export function AdminWorkersPage() {
  return (
    <SectionPage titleKey="workers">
      <WorkersTab />
    </SectionPage>
  );
}

export function AdminOrdersPage() {
  return (
    <SectionPage titleKey="orders">
      <OrdersTab />
    </SectionPage>
  );
}

export function AdminModerationPage() {
  const { t } = useTranslation();
  return (
    <SectionPage titleKey="moderation">
      <div className="space-y-8">
        <section aria-labelledby="reviews-title" className="space-y-3">
          <h2 id="reviews-title" className="text-xl font-bold">
            {t('admin.moderation.reviews')}
          </h2>
          <ReviewsTab />
        </section>
        <section aria-labelledby="complaints-title" className="space-y-3">
          <h2 id="complaints-title" className="text-xl font-bold">
            {t('admin.moderation.complaints')}
          </h2>
          <ComplaintsTab />
        </section>
      </div>
    </SectionPage>
  );
}

export function AdminMaterialsPage() {
  return (
    <SectionPage titleKey="materials">
      <MaterialsTab />
    </SectionPage>
  );
}

export const AdminProductsPage = () => <SectionPage titleKey="products" />;
export const AdminUsersPage = () => <SectionPage titleKey="users" />;
export const AdminCategoriesPage = () => <SectionPage titleKey="categories" />;
export const AdminSettingsPage = () => <SectionPage titleKey="settings" />;
