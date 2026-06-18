const INTEGRATIONS = [
  {
    name: "Jira",
    description:
      "Sync architecture decisions with Jira tickets. Auto-create tasks from ADR action items and track implementation progress.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    category: "Project Management",
  },
  {
    name: "GitHub",
    description:
      "Connect your repositories to analyze tech stack, review pull requests against ADRs, and track technology adoption across codebases.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    category: "Source Control",
  },
  {
    name: "Slack",
    description:
      "Receive risk alerts, advisory summaries, and ADR status updates directly in your Slack channels. Start advisory sessions from Slack.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    category: "Communication",
  },
  {
    name: "PagerDuty",
    description:
      "Route critical risk alerts to your on-call rotation. Escalate high-severity technology risks through your existing incident management workflow.",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    category: "Incident Management",
  },
] as const;

export default function IntegrationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect CTOaaS with your existing tools and workflows to maximize the
          value of AI advisory across your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
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
                    d={integration.icon}
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {integration.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    Planned for Phase 2
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {integration.category}
                </p>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Request integration */}
      <div className="mt-8 bg-muted/50 rounded-xl p-6 border border-border text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Need a different integration?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We are building integrations based on user demand. Let us know which
          tools you need connected.
        </p>
        <a
          href="mailto:integrations@connectsw.com"
          className="inline-flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
        >
          Request Integration
        </a>
      </div>
    </div>
  );
}
