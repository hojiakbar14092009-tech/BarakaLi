import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsDesktop } from '../../lib/useIsDesktop';

const CateringLanding = lazy(() => import('./CateringLanding'));

/** Desktop-only page; phones and tablets go to the marketplace on `/`. */
export default function CateringPage() {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<div className="min-h-[40rem]" />}>
      <CateringLanding />
    </Suspense>
  );
}
