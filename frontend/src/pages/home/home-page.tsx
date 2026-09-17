import { Navigate, useOutletContext } from 'react-router-dom';
import type { StaffSession } from '../../api/auth';
import { homePathFor } from '../../auth/home-path';

export function HomePage() {
  const session = useOutletContext<StaffSession>();
  return <Navigate to={homePathFor(session.role)} replace />;
}
