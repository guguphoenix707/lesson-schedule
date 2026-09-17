import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import type { StaffSession } from '../api/auth';
import { homePathFor } from '../auth/home-path';

export function AdminGuard() {
  const session = useOutletContext<StaffSession>();
  if (session.role !== 'admin') {
    return <Navigate to={homePathFor(session.role)} replace />;
  }
  return <Outlet context={session} />;
}
