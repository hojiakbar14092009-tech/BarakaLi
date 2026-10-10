import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RequireAuth } from './features/auth/RequireAuth';
import { AppLayout } from './layout/AppLayout';
import { useAuthStore } from './stores/auth';

const HomePage = lazy(() => import('./features/home/HomePage'));
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
      { path: '/kirish', element: <AuthPage mode="signin" /> },
      { path: '/royxatdan-otish', element: <AuthPage mode="signup" /> },
      {
        element: <RequireAuth role="worker" />,
        children: [
          { path: '/hunarmand/panel', element: <CabinetPage /> },
          { path: '/hunarmand/kalendar', element: <CalendarPage /> },
          { path: '/ishlar', element: <MyProductsPage /> },
          { path: '/daromad', element: <EarningsPage /> },
        ],
      },
      { path: '/hunarmand/:id', element: <WorkerPage /> },
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
