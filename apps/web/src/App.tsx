import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RequireAuth } from './features/auth/RequireAuth';
import { HomePage } from './features/home/HomePage';
import { AppLayout } from './layout/AppLayout';
import { useAuthStore } from './stores/auth';

const CategoryPage = lazy(() => import('./features/catalog/CategoryPage'));
const WorkerPage = lazy(() => import('./features/workers/WorkerPage'));
const ProductPage = lazy(() => import('./features/products/ProductPage'));
const CartPage = lazy(() => import('./features/cart/CartPage'));
const PaymentPage = lazy(() => import('./features/orders/PaymentPage'));
const OrdersPage = lazy(() => import('./features/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('./features/orders/OrderDetailPage'));
const CabinetPage = lazy(() => import('./features/cabinet/CabinetPage'));
const MyProductsPage = lazy(() => import('./features/cabinet/MyProductsPage'));
const EarningsPage = lazy(() => import('./features/cabinet/EarningsPage'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage'));
const NewServiceOrderPage = lazy(() => import('./features/orders/NewServiceOrderPage'));
const MaterialsPage = lazy(() => import('./features/materials/MaterialsPage'));
const MaterialPaymentPage = lazy(() => import('./features/materials/MaterialPaymentPage'));
const LessonsPage = lazy(() => import('./features/lessons/LessonsPage'));
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'));
const DashboardPage = lazy(() => import('./features/admin/DashboardPage'));
const AuditPage = lazy(() => import('./features/admin/AuditPage'));
const AdminWorkerDetailPage = lazy(() => import('./features/admin/AdminWorkerDetailPage'));
const adminSection = (name: keyof typeof import('./features/admin/sectionPages')) =>
  lazy(() => import('./features/admin/sectionPages').then((m) => ({ default: m[name] })));
const AdminWorkersPage = adminSection('AdminWorkersPage');
const AdminProductsPage = adminSection('AdminProductsPage');
const AdminOrdersPage = adminSection('AdminOrdersPage');
const AdminUsersPage = adminSection('AdminUsersPage');
const AdminModerationPage = adminSection('AdminModerationPage');
const AdminCategoriesPage = adminSection('AdminCategoriesPage');
const AdminMaterialsPage = adminSection('AdminMaterialsPage');
const AdminSettingsPage = adminSection('AdminSettingsPage');
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

// /hunarmand/panel is declared before /hunarmand/:id so "panel" is never read as an id.
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/xizmatlar/:kategoriya', element: <CategoryPage /> },
      { path: '/mahsulot/:id', element: <ProductPage /> },
      { path: '/savat', element: <CartPage /> },
      { path: '/darslar', element: <LessonsPage /> },
      { path: '/kirish', element: <AuthPage mode="signin" /> },
      { path: '/royxatdan-otish', element: <AuthPage mode="signup" /> },
      {
        element: <RequireAuth role="worker" />,
        children: [
          { path: '/hunarmand/panel', element: <CabinetPage /> },
          { path: '/hunarmand/kalendar', element: <CalendarPage /> },
          { path: '/ishlar', element: <MyProductsPage /> },
          { path: '/daromad', element: <EarningsPage /> },
          { path: '/materiallar', element: <MaterialsPage /> },
          { path: '/materiallar/tolov/:id', element: <MaterialPaymentPage /> },
        ],
      },
      { path: '/hunarmand/:id', element: <WorkerPage /> },
      {
        element: <RequireAuth role="admin" />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'hunarmandlar', element: <AdminWorkersPage /> },
              { path: 'hunarmandlar/:id', element: <AdminWorkerDetailPage /> },
              { path: 'mahsulotlar', element: <AdminProductsPage /> },
              { path: 'buyurtmalar', element: <AdminOrdersPage /> },
              { path: 'foydalanuvchilar', element: <AdminUsersPage /> },
              { path: 'sharhlar', element: <AdminModerationPage /> },
              { path: 'xizmat-turlari', element: <AdminCategoriesPage /> },
              { path: 'materiallar', element: <AdminMaterialsPage /> },
              { path: 'sozlamalar', element: <AdminSettingsPage /> },
              { path: 'audit', element: <AuditPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/buyurtma/yangi', element: <NewServiceOrderPage /> },
          { path: '/tolov/:orderId', element: <PaymentPage /> },
          { path: '/buyurtmalar', element: <OrdersPage /> },
          { path: '/buyurtmalar/:id', element: <OrderDetailPage /> },
          { path: '/profil', element: <ProfilePage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
