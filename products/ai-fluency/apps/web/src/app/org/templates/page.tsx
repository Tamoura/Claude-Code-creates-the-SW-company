import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Assessment Templates',
};

const defaultTemplates = [
  {
    id: 'standard',
    name: 'Standard AI Fluency',
    description: 'Full 50-question assessment covering all four dimensions.',
    questionCount: 50,
    duration: '20–30 min',
  },
  {
    id: 'quick',
    name: 'Quick Check',
    description: '15-question rapid assessment for regular pulse checks.',
    questionCount: 15,
    duration: '8–10 min',
  },
  {
    id: 'technical',
    name: 'Technical Practitioners',
    description: 'Advanced assessment for engineers and data scientists.',
    questionCount: 40,
    duration: '25–35 min',
  },
];

export default function TemplatesPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('org.templates.title')}
              </h1>
              <p className="mt-1 text-gray-600">
                Customise assessment templates for your organisation.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] transition-colors"
            >
              + Create Template
            </button>
          </div>

          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Default Templates
          </h2>
          <div className="grid gap-4">
            {defaultTemplates.map((tpl) => (
              <Card key={tpl.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="mb-1 font-semibold text-gray-900">{tpl.name}</h3>
                    <p className="mb-2 text-sm text-gray-600">{tpl.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{tpl.questionCount} questions</span>
                      <span aria-hidden="true">&bull;</span>
                      <span>{tpl.duration}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-[48px] flex items-center transition-colors"
                  >
                    Customise
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
