import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Space, Typography } from 'antd';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { sessionQueryKey, signOut } from '../api/auth';
import type { StaffSession } from '../api/auth';
import { Brand } from './brand';
import styles from './app-shell.module.css';

export function AppShell({ children }: { children: ReactNode }) {
  const session = useOutletContext<StaffSession>();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roleLabel = session.role === 'admin' ? '管理员' : '教师';
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryKey, null);
      navigate('/login', { replace: true });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <Space size={16}>
          <Typography.Text>
            {session.displayName} · {roleLabel}
          </Typography.Text>
          <Button
            loading={signOutMutation.isPending}
            onClick={() => {
              signOutMutation.mutate();
            }}
          >
            退出
          </Button>
        </Space>
      </header>
      {children}
    </div>
  );
}
