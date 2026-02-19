import Link from "next/link";

const features = [
  {
    id: "ssi",
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
          d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"
        />
      </svg>
    ),
    title: "Self-Sovereign Identity",
    description:
      "Own your digital identity completely. No central authority controls your data. You decide who sees what, and when.",
  },
  {
    id: "vc",
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
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      </svg>
    ),
    title: "Verifiable Credentials",
    description:
      "Receive tamper-proof digital credentials from trusted issuers. Present only what's needed — nothing more.",
  },
  {
    id: "zkp",
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
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    ),
    title: "Zero-Knowledge Privacy",
    description:
      "Prove facts about yourself without revealing underlying data. Age verification without exposing your birthdate.",
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
                <span className="text-white font-bold text-sm" aria-hidden="true">H</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">HumanID</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/about"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                About
              </Link>
              <Link
                href="/developer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Developers
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
        {/* Background decoration */}
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
            W3C Verifiable Credentials Standard
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
            Your Identity.
            <br />
            <span className="text-primary-500">Your Control.</span>
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            HumanID is a universal digital identity platform that puts you in
            charge. Built on self-sovereign identity principles, verifiable
            credentials, and zero-knowledge proofs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/about"
              className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Learn More
            </Link>
          </div>

          <p className="mt-5 text-sm text-gray-400">
            No credit card required. Your data stays yours.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built on open standards. Designed for trust.
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              HumanID implements the latest W3C and IETF identity standards so
              your credentials work everywhere.
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
            Ready to take control of your identity?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join thousands of users and organisations building on HumanID.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Create Your Identity
            </Link>
            <Link
              href="/developer"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-transparent text-gray-300 font-semibold border border-gray-600 hover:bg-gray-800 hover:text-white transition-colors text-base w-full sm:w-auto"
            >
              Developer Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs" aria-hidden="true">H</span>
            </div>
            <span className="text-gray-400 text-sm">HumanID</span>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} HumanID. Universal Digital Identity.
          </p>
          <div className="flex gap-6">
            <Link
              href="/about"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              About
            </Link>
            <Link
              href="/developer"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Developers
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
