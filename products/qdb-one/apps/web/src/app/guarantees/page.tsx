'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteesByOrg, getClaimsByGuarantee } from '@/data/guarantees';

export default function GuaranteesPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const guarantees = getGuaranteesByOrg(activeOrg.orgId);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusColor: Record<string, string> = {
    active: 'var(--success)',
    pending_signature: 'var(--warning)',
    expired: 'var(--muted)',
    claimed: 'var(--danger)',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Guarantees Portal', 'بوابة الضمانات')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t('Manage guarantees and claims', 'إدارة الضمانات والمطالبات')}
        </p>
      </div>

      {/* Guarantees Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">{t('All Guarantees', 'جميع الضمانات')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('ID', 'الرقم')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Type', 'النوع')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Amount', 'المبلغ')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Status', 'الحالة')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Expiry Date', 'تاريخ الانتهاء')}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Beneficiary', 'المستفيد')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {guarantees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                    {t('No guarantees found', 'لا توجد ضمانات')}
                  </td>
                </tr>
              ) : (
                guarantees.map((guarantee) => {
                  const claims = getClaimsByGuarantee(guarantee.id);
                  return (
                    <tr key={guarantee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/guarantees/${guarantee.id}`}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          {guarantee.id}
                        </Link>
                        {claims.length > 0 && (
                          <div className="text-xs text-[var(--danger)] mt-1">
                            {t(`${claims.length} claim(s)`, `${claims.length} مطالبة`)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">{guarantee.type}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--foreground)]">
                        QAR {formatAmount(guarantee.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${statusColor[guarantee.status]}20`,
                            color: statusColor[guarantee.status],
                          }}
                        >
                          {guarantee.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                        {formatDate(guarantee.expiryDate)}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">{guarantee.beneficiary}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
