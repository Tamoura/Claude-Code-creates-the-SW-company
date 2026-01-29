import { useTranslation } from 'react-i18next';

export interface Reference {
  id: number;
  authors?: string;
  title: string;
  source: string;
  date?: string;
  url: string;
  accessDate: string;
}

interface ReferencesProps {
  references: Reference[];
}

export default function References({ references }: ReferencesProps) {
  const { t } = useTranslation();

  return (
    <section className="mt-16 border-t-2 border-gray-300 pt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t('sovereignty.references.title', 'References')}
      </h2>
      <div className="bg-gray-50 rounded-lg p-6">
        <ol className="space-y-4">
          {references.map((ref) => (
            <li key={ref.id} id={`ref-${ref.id}`} className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">[{ref.id}]</span>{' '}
              {ref.authors && <span>{ref.authors}. </span>}
              <span className="italic">{ref.title}</span>.{' '}
              <span>{ref.source}</span>
              {ref.date && <span>, {ref.date}</span>}.{' '}
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {ref.url}
              </a>
              <span className="text-gray-500"> (accessed {ref.accessDate})</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 text-xs text-gray-500 italic">
        <p>{t('sovereignty.references.note', 'All references were verified and accessed on the date indicated. External links open in new windows.')}</p>
      </div>
    </section>
  );
}
