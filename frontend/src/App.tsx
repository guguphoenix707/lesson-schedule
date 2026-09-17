import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import {
  Navigate,
  Route,
  Routes,
  unstable_HistoryRouter as HistoryRouter,
} from 'react-router-dom';
import { HomePage } from './pages/home/home-page';
import { LoginRoute } from './pages/login/login-route';
import { ScheduleTrialPage } from './pages/schedule-trial/schedule-trial-page';
import { TeacherTrialTaskListPage } from './pages/teacher/trial-task/list';
import { TeacherTrialProcessPage } from './pages/teacher/trial-task/process';
import { TrialTasklistPage } from './pages/trial-tasklist/trial-tasklist-page';
import { AdminGuard } from './routes/admin-guard';
import { AuthGuard } from './routes/auth-guard';
import { history } from './routes/history';
import { TeacherGuard } from './routes/teacher-guard';

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
          <HistoryRouter history={history as never}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<AuthGuard />}>
                <Route path="/" element={<HomePage />} />
                <Route element={<AdminGuard />}>
                  <Route
                    path="/trial-tasklist"
                    element={<TrialTasklistPage />}
                  />
                  <Route
                    path="/scheduleTrial/:trialID"
                    element={<ScheduleTrialPage />}
                  />
                </Route>
                <Route element={<TeacherGuard />}>
                  <Route
                    path="/teacher/trial-task/list"
                    element={<TeacherTrialTaskListPage />}
                  />
                  <Route
                    path="/teacher/trial-task/:participantId"
                    element={<TeacherTrialProcessPage />}
                  />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HistoryRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
