import Link from 'next/link';

const sampleResources = [
  {
    title: 'Getting Started with ISO 27001',
    category: 'Framework Guide',
    description: 'A comprehensive introduction to implementing ISO 27001 information security management.',
  },
  {
    title: 'CISA Certification Prep Guide',
    category: 'Certification',
    description: 'Study plan and key topics for the Certified Information Systems Auditor exam.',
  },
  {
    title: 'NIST CSF 2.0 Overview',
    category: 'Framework Guide',
    description: 'What changed in NIST Cybersecurity Framework 2.0 and how to adopt it.',
  },
];

export default function ResourcesPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Resource Hub
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Curated GRC content to help you stay current with frameworks,
          certifications, and industry best practices.
        </p>

        <div className="grid gap-6">
          {sampleResources.map((resource) => (
            <div
              key={resource.title}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow"
            >
              <span className="inline-block text-xs font-medium text-accent bg-accent-50 px-2 py-1 rounded mb-3">
                {resource.category}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {resource.title}
              </h3>
              <p className="text-gray-600 text-sm">{resource.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 mb-4">
            Sign in to access the full resource library with bookmarks
            and personalized recommendations.
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Sign Up for Full Access
          </Link>
        </div>
      </div>
    </div>
  );
}
