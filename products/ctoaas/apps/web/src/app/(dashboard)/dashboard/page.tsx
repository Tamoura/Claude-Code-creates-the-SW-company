import Link from "next/link";

const DASHBOARD_CARDS = [
  {
    title: "AI Advisory Sessions",
    description:
      "Start a conversation with your AI CTO advisor for strategic guidance.",
    href: "/chat",
    count: 0,
    label: "sessions",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Architecture Decisions",
    description:
      "Review and manage your Architecture Decision Records (ADRs).",
    href: "/dashboard",
    count: 0,
    label: "ADRs recorded",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Tech Radar",
    description:
      "Visualize your technology landscape and track adoption status.",
    href: "/dashboard",
    count: 0,
    label: "technologies tracked",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
] as const;

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome to CTOaaS
        </h1>
        <p className="text-muted-foreground mt-1">
          Your AI-powered CTO advisory dashboard. Get strategic
          guidance tailored to your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DASHBOARD_CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block bg-background rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={card.icon}
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {card.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.description}
                </p>
                <p className="text-sm font-medium text-primary-600 mt-3">
                  {card.count} {card.label}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick start */}
      <div className="mt-8 bg-primary-50 rounded-xl p-6 border border-primary-100">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Get started with your AI advisor
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload your organization context (tech stack, team
          structure, constraints) to receive tailored advisory
          recommendations.
        </p>
        <Link
          href="/chat"
          className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
        >
          Start a session
        </Link>
      </div>
    </div>
  );
}
