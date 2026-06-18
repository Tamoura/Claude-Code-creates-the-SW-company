const FRAMEWORKS = [
  {
    name: "SOC 2",
    fullName: "SOC 2 Type II",
    description:
      "Service Organization Control 2 assessment covering security, availability, processing integrity, confidentiality, and privacy trust service criteria.",
    controls: 64,
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    name: "ISO 27001",
    fullName: "ISO/IEC 27001:2022",
    description:
      "International standard for information security management systems (ISMS). Covers risk assessment, access control, cryptography, and physical security.",
    controls: 93,
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    name: "GDPR",
    fullName: "General Data Protection Regulation",
    description:
      "European Union regulation on data protection and privacy. Covers data subject rights, lawful processing, data protection impact assessments, and breach notification.",
    controls: 42,
    icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  },
  {
    name: "HIPAA",
    fullName: "Health Insurance Portability and Accountability Act",
    description:
      "United States regulation for protecting sensitive patient health information. Covers administrative, physical, and technical safeguards for electronic protected health information.",
    controls: 54,
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
] as const;

export default function CompliancePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Assess your compliance posture against industry frameworks. Track
          control coverage, identify gaps, and generate audit-ready evidence.
        </p>
      </div>

      {/* Framework cards */}
      <section aria-label="Compliance frameworks">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Compliance Frameworks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FRAMEWORKS.map((framework) => (
            <div
              key={framework.name}
              className="bg-background rounded-xl p-6 shadow-sm border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={framework.icon}
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {framework.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Not assessed
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {framework.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {framework.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {framework.controls} controls
                    </span>
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center border border-border text-muted-foreground px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] cursor-not-allowed opacity-60"
                      aria-label={`Start ${framework.name} assessment`}
                    >
                      Start Assessment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assessment history */}
      <section className="mt-10" aria-label="Assessment history">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Assessment History
        </h2>
        <div className="bg-background rounded-xl p-8 border border-border text-center">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-muted-foreground font-medium">
            No assessments completed yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Select a framework above to begin your first compliance assessment.
          </p>
        </div>
      </section>
    </div>
  );
}
