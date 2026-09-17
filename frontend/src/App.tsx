import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/home/home-page';
import { LoginRoute } from './pages/login/login-route';
import { AuthGuard } from './routes/auth-guard';

const queryClient = new QueryClient();

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#5c5aa7',
    colorInfo: '#5c5aa7',
    colorBgLayout: '#c9ccd4',
    colorText: '#191a22',
    colorTextSecondary: '#747681',
    borderRadius: 12,
    controlHeightLG: 48,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <AntdApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<AuthGuard />}>
                <Route path="/" element={<HomePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
