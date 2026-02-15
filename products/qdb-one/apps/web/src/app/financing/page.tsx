'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoansByOrg, getApplicationsByOrg } from '@/data/financing';

export default function FinancingPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const loans = getLoansByOrg(activeOrg.orgId);
  const applications = getApplicationsByOrg(activeOrg.orgId);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusColor: Record<string, string> = {
    active: 'var(--success)',
    closed: 'var(--muted)',
    defaulted: 'var(--danger)',
    draft: 'var(--muted)',
    submitted: 'var(--primary)',
    under_review: 'var(--warning)',
    approved: 'var(--success)',
    rejected: 'var(--danger)',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Financing Portal', 'بوابة التمويل')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t('Manage loans and applications', 'إدارة القروض والطلبات')}
        </p>
      </div>

      {/* Loans Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('Active Loans', 'القروض النشطة')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Loan ID', 'رقم القرض')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Type', 'النوع')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Outstanding Balance', 'الرصيد المستحق')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Status', 'الحالة')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Next Payment', 'الدفعة القادمة')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                    {t('No loans found', 'لا توجد قروض')}
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/financing/loans/${loan.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                        {loan.id}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">{loan.type}</td>
                    <td className="px-5 py-4 text-sm font-medium text-[var(--foreground)]">
                      QAR {formatAmount(loan.outstandingBalance)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${statusColor[loan.status]}20`, color: statusColor[loan.status] }}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                      {formatDate(loan.nextPaymentDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applications Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('Loan Applications', 'طلبات القروض')}</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {applications.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              {t('No applications found', 'لا توجد طلبات')}
            </div>
          ) : (
            applications.map((app) => (
              <Link
                key={app.id}
                href={`/financing/applications/${app.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{app.id}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{app.type}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    QAR {formatAmount(app.amount)}
                  </div>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${statusColor[app.status]}20`, color: statusColor[app.status] }}
                  >
                    {app.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
