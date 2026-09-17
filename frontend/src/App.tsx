import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Typography } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<Typography.Title>Class</Typography.Title>}
            />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
