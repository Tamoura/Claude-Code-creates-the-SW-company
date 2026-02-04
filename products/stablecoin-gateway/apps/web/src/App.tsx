import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi-config';
import { TokenManager } from './lib/token-manager';
// Keep commonly-used components as eager imports
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('./pages/HomePageNew'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPageNew'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const CheckoutSuccess = lazy(() => import('./pages/checkout/CheckoutSuccess'));
const CheckoutFailed = lazy(() => import('./pages/checkout/CheckoutFailed'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const CreatePaymentLink = lazy(() => import('./pages/dashboard/CreatePaymentLink'));
const PaymentsList = lazy(() => import('./pages/dashboard/PaymentsList'));
const PaymentDetail = lazy(() => import('./pages/dashboard/PaymentDetail'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Invoices = lazy(() => import('./pages/dashboard/Invoices'));
const Refunds = lazy(() => import('./pages/dashboard/Refunds'));
const ApiKeys = lazy(() => import('./pages/dashboard/ApiKeys'));
const Webhooks = lazy(() => import('./pages/dashboard/Webhooks'));
const Security = lazy(() => import('./pages/dashboard/Security'));
const MerchantsList = lazy(() => import('./pages/dashboard/admin/MerchantsList'));
const MerchantPayments = lazy(() => import('./pages/dashboard/admin/MerchantPayments'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const DocsLayout = lazy(() => import('./pages/docs/DocsLayout'));
const QuickStart = lazy(() => import('./pages/docs/QuickStart'));
const ApiReference = lazy(() => import('./pages/docs/ApiReference'));
const WebhooksDocs = lazy(() => import('./pages/docs/WebhooksDocs'));
const SdkDocs = lazy(() => import('./pages/docs/SdkDocs'));

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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
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
                    <Route path="refunds" element={<Refunds />} />
                    <Route path="api-keys" element={<ApiKeys />} />
                    <Route path="webhooks" element={<Webhooks />} />
                    <Route path="security" element={<Security />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="admin/merchants" element={<MerchantsList />} />
                    <Route path="admin/merchants/:id/payments" element={<MerchantPayments />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
