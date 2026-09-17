import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import type { StaffSession } from '../api/auth';
import { homePathFor } from '../auth/home-path';

export function TeacherGuard() {
  const session = useOutletContext<StaffSession>();
  if (session.role !== 'teacher') {
    return <Navigate to={homePathFor(session.role)} replace />;
  }
  return <Outlet context={session} />;
}
