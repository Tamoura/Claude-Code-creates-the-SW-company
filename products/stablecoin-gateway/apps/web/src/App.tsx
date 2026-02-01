import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi-config';
// Use new production pages (old prototype pages kept for reference)
import HomePage from './pages/HomePageNew';
import PaymentPage from './pages/PaymentPageNew';
import StatusPage from './pages/StatusPage'; // Keep status page as-is for now
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import PaymentsList from './pages/dashboard/PaymentsList';
import Settings from './pages/dashboard/Settings';
import Invoices from './pages/dashboard/Invoices';
import ApiKeys from './pages/dashboard/ApiKeys';
import Webhooks from './pages/dashboard/Webhooks';
import Security from './pages/dashboard/Security';
import Login from './pages/auth/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/pay/:id" element={<PaymentPage />} />
              <Route path="/status/:id" element={<StatusPage />} />
              <Route path="/login" element={<Login />} />

              {/* Dashboard routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="payments" element={<PaymentsList />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="api-keys" element={<ApiKeys />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="security" element={<Security />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Router>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
