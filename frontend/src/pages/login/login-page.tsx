import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Checkbox, Form, Input, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { sessionQueryKey, signInWithEmail } from '../../api/auth';
import { Brand } from '../../components/brand';
import styles from './login-page.module.css';

interface LoginValues {
  email: string;
  password: string;
  remember?: boolean;
}

interface LoginLocationState {
  from?: string;
}

export function LoginPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state } = location;
  const locationState = state as LoginLocationState | null;
  const signInMutation = useMutation({
    mutationFn: signInWithEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      navigate(locationState?.from ?? '/', { replace: true });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <div className={styles.brand}>
          <Brand />
        </div>
        <Typography.Title className={styles.title} level={2}>
          登录
        </Typography.Title>

        <Form<LoginValues>
          initialValues={{ remember: true }}
          layout="vertical"
          requiredMark={false}
          classNames={{ label: styles.label, root: styles.item }}
          onFinish={(values) => {
            signInMutation.mutate(values);
          }}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input
              autoComplete="username"
              prefix={<MailOutlined />}
              placeholder="name@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              autoComplete="current-password"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            className={styles.remember}
            name="remember"
            valuePropName="checked"
          >
            <Checkbox>保持登录</Checkbox>
          </Form.Item>

          <Button
            block
            className={styles.submit}
            htmlType="submit"
            loading={signInMutation.isPending}
            size="large"
            type="primary"
          >
            登录
          </Button>
        </Form>
      </main>
    </div>
  );
}
