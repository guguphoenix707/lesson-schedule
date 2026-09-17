import { Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchCurrentSession, sessionQueryKey } from '../api/session';
import { RouteStatus } from './route-status';

export function AuthGuard() {
  const location = useLocation();
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

  if (sessionQuery.isError) {
    return (
      <RouteStatus>
        <Alert showIcon type="error" title="无法连接登录服务，请稍候刷新重试" />
      </RouteStatus>
    );
  }

  if (!sessionQuery.data) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <Outlet context={sessionQuery.data} />;
}
