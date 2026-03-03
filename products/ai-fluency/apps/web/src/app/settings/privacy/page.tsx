import type { Metadata } from 'next';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Privacy Settings',
};

const rights = [
  {
    title: 'Right of Access',
    description: 'You can request a copy of all personal data we hold about you.',
  },
  {
    title: 'Right to Rectification',
    description: 'You can request corrections to any inaccurate personal data.',
  },
  {
    title: 'Right to Erasure',
    description: 'You can request deletion of your account and all associated data.',
  },
  {
    title: 'Right to Data Portability',
    description: 'You can export your data in a machine-readable format (JSON).',
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t('settings.privacy.title')}
          </h1>
          <p className="mb-8 text-gray-600">
            {t('settings.privacy.gdpr_description')}
          </p>

          {/* GDPR rights */}
          <Card padding="lg" className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Your GDPR Rights
            </h2>
            <ul className="space-y-4" role="list">
              {rights.map((right) => (
                <li key={right.title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{right.title}</p>
                    <p className="text-sm text-gray-600">{right.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Export data */}
          <Card padding="lg" className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Export Your Data
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Download all personal data, assessment results, and learning progress in JSON format.
            </p>
            <button
              type="button"
              className="inline-flex min-h-[48px] items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
              aria-describedby="export-description"
            >
              {t('settings.privacy.export')}
            </button>
            <p id="export-description" className="mt-2 text-xs text-gray-400">
              Export requests are processed within 30 days per GDPR Article 20.
            </p>
          </Card>

          {/* Delete account */}
          <Card padding="lg" className="border-danger-200 bg-danger-50">
            <h2 className="mb-2 text-lg font-semibold text-danger-700">
              Danger Zone
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              type="button"
              className="inline-flex min-h-[48px] items-center rounded-lg bg-danger-500 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 transition-colors"
            >
              {t('settings.privacy.delete')}
            </button>
          </Card>

          <div className="mt-6 text-center">
            <Link
              href="mailto:privacy@aifluency.io"
              className="text-sm text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
            >
              Contact our Privacy Team at privacy@aifluency.io
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
