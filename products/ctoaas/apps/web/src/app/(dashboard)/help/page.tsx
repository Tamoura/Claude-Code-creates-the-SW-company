const FAQ_ITEMS = [
  {
    question: "What is CTOaaS?",
    answer:
      "CTOaaS (CTO as a Service) is an AI-powered advisory platform that provides strategic technology guidance. It acts as your virtual CTO, helping with architecture decisions, risk assessment, cost analysis, and technology strategy.",
  },
  {
    question: "How does the AI advisor work?",
    answer:
      "The AI advisor uses your organizational context — tech stack, team size, industry, and challenges — to provide tailored recommendations. It draws from curated knowledge bases of engineering best practices, architecture patterns, and industry benchmarks.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All conversations and organizational data are encrypted at rest and in transit. We follow SOC 2 Type II controls and never share your data with third parties. Your data is never used to train AI models.",
  },
  {
    question: "Can I use CTOaaS for my team?",
    answer:
      "Yes. The Pro and Enterprise plans support team collaboration. You can invite team members, assign roles, and share conversation threads. Enterprise plans include SSO and advanced access controls.",
  },
  {
    question: "What types of decisions can CTOaaS help with?",
    answer:
      "CTOaaS helps with architecture decisions, build vs. buy evaluations, technology selection, migration planning, cost optimization, risk assessment, compliance readiness, and team scaling strategies.",
  },
  {
    question: "How do Architecture Decision Records (ADRs) work?",
    answer:
      "The ADR feature helps you draft, review, and maintain architecture decision records. The AI assists with structuring your decisions, identifying consequences, and suggesting alternatives based on industry patterns.",
  },
  {
    question: "Can I integrate CTOaaS with my existing tools?",
    answer:
      "Integration support for Jira, GitHub, Slack, and PagerDuty is planned for Phase 2. Check the Integrations page for the latest status and to express interest in specific integrations.",
  },
] as const;

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted-foreground mt-1">
          Find answers to common questions about CTOaaS and get the most out of
          your AI advisory experience.
        </p>
      </div>

      {/* FAQ Section */}
      <section aria-label="Frequently asked questions">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              role="group"
              aria-label={item.question}
              className="bg-background rounded-xl border border-border overflow-hidden"
            >
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset min-h-[48px] text-sm font-medium text-foreground list-none">
                  {item.question}
                  <svg
                    className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section className="mt-12 bg-primary-50 rounded-xl p-6 border border-primary-200">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Still need help?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Our support team is available to assist you with any questions not
          covered in the FAQ.
        </p>
        <a
          href="mailto:support@connectsw.com"
          className="inline-flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
        >
          Contact Support
        </a>
      </section>
    </div>
  );
}
