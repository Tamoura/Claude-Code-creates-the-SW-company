import Link from "next/link";

const features = [
  {
    id: "ai-generation",
    icon: (
      <svg
        className="w-7 h-7 text-primary-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
    ),
    title: "AI-Powered Generation",
    description:
      "Describe your system in plain English and get a standards-compliant architecture diagram in seconds. ArchiMate, C4, or TOGAF — your choice.",
  },
  {
    id: "canvas",
    icon: (
      <svg
        className="w-7 h-7 text-success-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
        />
      </svg>
    ),
    title: "Interactive Canvas",
    description:
      "Refine AI-generated diagrams on an interactive canvas. Drag, connect, annotate, and perfect your architecture with visual precision.",
  },
  {
    id: "export",
    icon: (
      <svg
        className="w-7 h-7 text-warning-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    ),
    title: "Multi-Format Export",
    description:
      "Export to PNG, SVG, PDF, PlantUML, ArchiMate XML, Mermaid, or Draw.io. Share with any tool your team already uses.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm" aria-hidden="true">A</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">ArchForge</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/templates"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Templates
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm px-4 py-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-primary-100 opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-success-100 opacity-30 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" aria-hidden="true" />
            ArchiMate 3.2 + C4 Model + TOGAF
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
            Describe Systems.
            <br />
            <span className="text-primary-500">Generate Architecture.</span>
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            ArchForge transforms natural language into standards-compliant enterprise
            architecture diagrams. ArchiMate, C4, TOGAF — powered by AI,
            refined by you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Start Building — It&apos;s Free
            </Link>
            <Link
              href="/templates"
              className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Browse Templates
            </Link>
          </div>

          <p className="mt-5 text-sm text-gray-400">
            No credit card required. Free tier includes 50K AI tokens/hour.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              From words to architecture in seconds
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              ArchForge combines AI generation, an interactive canvas, and
              multi-format export into one seamless workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform how you design architecture?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join enterprise architects and solution designers building
            standards-compliant diagrams with AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Create Free Account
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-transparent text-gray-300 font-semibold border border-gray-600 hover:bg-gray-800 hover:text-white transition-colors text-base w-full sm:w-auto"
            >
              Explore Templates
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs" aria-hidden="true">A</span>
            </div>
            <span className="text-gray-400 text-sm">ArchForge</span>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} ArchForge. AI-Powered Enterprise Architecture.
          </p>
          <div className="flex gap-6">
            <Link
              href="/templates"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/settings"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
