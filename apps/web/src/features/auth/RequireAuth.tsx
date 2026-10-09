import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../../components/StateViews';
import { useAuthStore } from '../../stores/auth';

interface RequireAuthProps {
  role?: 'worker';
}

/** Convenience guard only: every endpoint enforces access on the server as well. */
export function RequireAuth({ role }: RequireAuthProps) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (status !== 'ready') return <LoadingState />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/kirish?next=${next}`} replace />;
  }
  if (role === 'worker' && !user.workerId) {
    return <Navigate to="/royxatdan-otish?rol=hunarmand" replace />;
  }
  return <Outlet />;
}
