const REPORT_TYPES = [
  {
    name: "Board Report",
    description:
      "Executive summary for board presentation. Covers technology strategy progress, risk posture, budget utilization, and key decisions made during the reporting period.",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    outputs: ["PDF", "PowerPoint"],
  },
  {
    name: "Tech Health",
    description:
      "Comprehensive assessment of your technology landscape. Includes dependency currency, security vulnerability status, performance metrics, and technical debt quantification.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    outputs: ["PDF", "JSON"],
  },
  {
    name: "Cost Summary",
    description:
      "Detailed breakdown of technology costs across infrastructure, licensing, and personnel. Includes trend analysis, optimization recommendations, and projected savings.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    outputs: ["PDF", "CSV"],
  },
] as const;

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate executive-ready reports from your advisory data, risk
          assessments, and cost analyses.
        </p>
      </div>

      {/* Report types */}
      <section aria-label="Report types">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Available Report Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPORT_TYPES.map((report) => (
            <div
              key={report.name}
              className="bg-background rounded-xl p-6 shadow-sm border border-border flex flex-col"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
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
                    d={report.icon}
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {report.name}
              </h3>
              <p className="text-sm text-muted-foreground flex-1">
                {report.description}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Formats:
                </span>
                {report.outputs.map((format) => (
                  <span
                    key={format}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                  >
                    {format}
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled
                className="mt-4 inline-flex items-center justify-center border border-border text-muted-foreground px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] cursor-not-allowed opacity-60"
                aria-label={`Generate ${report.name} report`}
              >
                Generate Report
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Generated reports */}
      <section className="mt-10" aria-label="Generated reports">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Generated Reports
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-muted-foreground font-medium">
            No reports generated yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your organization profile and run assessments to generate
            your first report.
          </p>
        </div>
      </section>
    </div>
  );
}
