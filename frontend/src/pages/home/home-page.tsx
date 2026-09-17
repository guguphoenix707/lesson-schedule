import { Typography } from 'antd';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { StaffSession } from '../../api/auth';
import { homePathFor } from '../../auth/home-path';
import { AppShell } from '../../components/app-shell';
import styles from './home-page.module.css';

export function HomePage() {
  const session = useOutletContext<StaffSession>();
  if (session.role === 'admin') {
    return <Navigate to={homePathFor('admin')} replace />;
  }

  return (
    <AppShell>
      <main className={styles.content}>
        <Typography.Title className={styles.title} level={3}>
          工作台
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          当前登录 {session.email}
        </Typography.Paragraph>
      </main>
    </AppShell>
  );
}
