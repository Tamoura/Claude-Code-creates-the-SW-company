"use client";

import Link from "next/link";

const COST_SECTIONS = [
  {
    title: "TCO Calculator",
    description:
      "Compare total cost of ownership across technology options. Evaluate upfront costs, recurring expenses, team costs, and scaling factors over a 3-year horizon.",
    href: "/costs/tco",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    title: "Cloud Spend Analysis",
    description:
      "Track and analyze your cloud infrastructure costs. Compare spending against industry benchmarks and get AI-powered recommendations for optimization.",
    href: "/costs/cloud-spend",
    icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  },
] as const;

/**
 * Cost analysis hub page with links to TCO calculator and Cloud Spend.
 * [US-12][US-13][FR-023][FR-027]
 */
export default function CostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Cost Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Evaluate technology investments and optimize cloud spending.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COST_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block rounded-xl border border-border bg-background p-6 hover:shadow-md hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-shadow"
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
                    d={section.icon}
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
