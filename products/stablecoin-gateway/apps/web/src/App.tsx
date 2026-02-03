import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi-config';
import { TokenManager } from './lib/token-manager';
// Use new production pages (old prototype pages kept for reference)
import HomePage from './pages/HomePageNew';
import PricingPage from './pages/PricingPage';
import PaymentPage from './pages/PaymentPageNew';
import StatusPage from './pages/StatusPage'; // Keep status page as-is for now
import CheckoutSuccess from './pages/checkout/CheckoutSuccess';
import CheckoutFailed from './pages/checkout/CheckoutFailed';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import CreatePaymentLink from './pages/dashboard/CreatePaymentLink';
import PaymentsList from './pages/dashboard/PaymentsList';
import PaymentDetail from './pages/dashboard/PaymentDetail';
import Settings from './pages/dashboard/Settings';
import Invoices from './pages/dashboard/Invoices';
import ApiKeys from './pages/dashboard/ApiKeys';
import Webhooks from './pages/dashboard/Webhooks';
import Security from './pages/dashboard/Security';
import MerchantsList from './pages/dashboard/admin/MerchantsList';
import MerchantPayments from './pages/dashboard/admin/MerchantPayments';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DocsLayout from './pages/docs/DocsLayout';
import QuickStart from './pages/docs/QuickStart';
import ApiReference from './pages/docs/ApiReference';
import WebhooksDocs from './pages/docs/WebhooksDocs';
import SdkDocs from './pages/docs/SdkDocs';

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
              <Route path="/" element={TokenManager.hasToken() ? <Navigate to="/dashboard" replace /> : <HomePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/pay/:id" element={<PaymentPage />} />
              <Route path="/status/:id" element={<StatusPage />} />
              <Route path="/checkout/:id/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/:id/failed" element={<CheckoutFailed />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Documentation routes */}
              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<Navigate to="/docs/quickstart" replace />} />
                <Route path="quickstart" element={<QuickStart />} />
                <Route path="api-reference" element={<ApiReference />} />
                <Route path="webhooks" element={<WebhooksDocs />} />
                <Route path="sdk" element={<SdkDocs />} />
              </Route>

              {/* Dashboard routes (protected) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="create" element={<CreatePaymentLink />} />
                  <Route path="payments" element={<PaymentsList />} />
                  <Route path="payments/:id" element={<PaymentDetail />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="api-keys" element={<ApiKeys />} />
                  <Route path="webhooks" element={<Webhooks />} />
                  <Route path="security" element={<Security />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin/merchants" element={<MerchantsList />} />
                  <Route path="admin/merchants/:id/payments" element={<MerchantPayments />} />
                </Route>
              </Route>
            </Routes>
          </Router>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
