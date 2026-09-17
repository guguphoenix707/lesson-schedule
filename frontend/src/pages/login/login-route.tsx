import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { fetchCurrentSession, sessionQueryKey } from '../../api/auth';
import { homePathFor } from '../../auth/home-path';
import { RouteStatus } from '../../routes/route-status';
import { LoginPage } from './login-page';

export function LoginRoute() {
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchCurrentSession,
    retry: false,
  });

  if (sessionQuery.isPending) {
    return (
      <RouteStatus>
        <Spin size="large" />
      </RouteStatus>
    );
  }

  if (sessionQuery.data) {
    return <Navigate to={homePathFor(sessionQuery.data.role)} replace />;
  }

  return <LoginPage />;
}
