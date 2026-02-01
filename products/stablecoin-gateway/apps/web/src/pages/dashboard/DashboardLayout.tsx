import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/dashboard/Sidebar';
import TopHeader from '../../components/dashboard/TopHeader';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/payments': 'Payments',
  '/dashboard/invoices': 'Invoices',
  '/dashboard/api-keys': 'API Keys',
  '/dashboard/webhooks': 'Webhooks & Docs',
  '/dashboard/security': 'Security',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin/merchants': 'Merchants',
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname]
    || (location.pathname.match(/^\/dashboard\/admin\/merchants\/.+\/payments$/) ? 'Merchant Payments' : null)
    || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col">
        <TopHeader title={title} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
