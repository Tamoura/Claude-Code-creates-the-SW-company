import Link from 'next/link';
import {
  Brain,
  Shield,
  DollarSign,
  Radar,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              CTOaaS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-[8px] px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-[8px] bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-32 pb-24">
        <div className="mx-auto max-w-[80rem] text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="text-micro text-brand">AI-POWERED ADVISORY</span>
          </div>
          <h1 className="text-display mx-auto max-w-3xl text-slate-950">
            Your trusted AI advisor for technology leadership
          </h1>
          <p className="text-body mx-auto mt-6 max-w-2xl text-slate-500">
            Make better technology decisions with personalized AI advisory grounded in the
            collective wisdom of elite engineering organizations. Risk analysis, cost
            optimization, and strategic guidance — always available.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-[8px] bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="rounded-[8px] border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-900 hover:border-slate-300 hover:bg-slate-50"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="mx-auto max-w-[80rem] px-6 text-center">
          <p className="text-overline text-slate-400">TRUSTED BY TECHNOLOGY LEADERS AT</p>
          <div className="mt-6 flex items-center justify-center gap-12">
            {['Series A Startups', 'Mid-Market SaaS', 'Enterprise Teams', 'Technical Co-Founders'].map(
              (label) => (
                <span key={label} className="text-body-sm font-medium text-slate-400">
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-[80rem]">
          <div className="text-center">
            <p className="text-overline text-brand">CAPABILITIES</p>
            <h2 className="text-h1 mt-3 text-slate-900">
              Everything a CTO needs, powered by AI
            </h2>
            <p className="text-body mt-4 mx-auto max-w-2xl text-slate-500">
              From strategic advisory to risk management, CTOaaS provides the tools and
              intelligence to make confident technology decisions.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Brain,
                title: 'AI Advisory Chat',
                description:
                  'Conversational AI grounded in curated knowledge from Uber, Spotify, Netflix, and Meta engineering practices.',
                color: 'text-brand',
                bg: 'bg-brand-light',
              },
              {
                icon: Shield,
                title: 'Risk Dashboard',
                description:
                  'Proactive risk surfacing across tech debt, vendor concentration, compliance gaps, and operational issues.',
                color: 'text-error',
                bg: 'bg-error-light',
              },
              {
                icon: DollarSign,
                title: 'Cost Analysis',
                description:
                  'TCO comparisons, cloud spend optimization, and build-vs-buy scenario modeling with 3-year projections.',
                color: 'text-success',
                bg: 'bg-success-light',
              },
              {
                icon: Radar,
                title: 'Tech Radar',
                description:
                  'Interactive technology radar tracking industry trends relevant to your stack, updated with AI insights.',
                color: 'text-[#8b5cf6]',
                bg: 'bg-[#f5f3ff]',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring transition-shadow hover:shadow-card-hover"
              >
                <div
                  className={`${feature.bg} inline-flex h-10 w-10 items-center justify-center rounded-[8px]`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-h3 mt-4 text-slate-900">{feature.title}</h3>
                <p className="text-body-sm mt-2 text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-24 px-6">
        <div className="mx-auto max-w-[80rem]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <div>
              <p className="text-overline text-brand">WHY CTOAAS</p>
              <h2 className="text-h1 mt-3 text-slate-900">
                1/100th the cost of traditional consulting
              </h2>
              <p className="text-body mt-4 text-slate-500">
                A single bad architecture decision costs 6-12 months and $500K+ to reverse.
                CTOaaS gives you the advisory to avoid those mistakes — at a fraction of consulting prices.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Personalized to your company context, stack, and challenges',
                  'Available 24/7 — not on a 2-week consulting cycle',
                  'Grounded in real engineering practices, not generic AI',
                  'Learns your preferences and decision history over time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-body text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              {/* Pricing preview */}
              <div className="w-full max-w-sm rounded-[12px] border border-slate-200 bg-white p-8 shadow-ring">
                <p className="text-overline text-slate-400">PRO PLAN</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-tabular text-[48px] font-light leading-[1.08] tracking-[-0.031em] text-slate-950">
                    $300
                  </span>
                  <span className="text-body-sm text-slate-400">/month</span>
                </div>
                <p className="text-body-sm mt-2 text-slate-500">
                  Unlimited advisory, full risk dashboard, cost analysis, and tech radar.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-6 flex w-full items-center justify-center rounded-[8px] bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
                >
                  Start Free Trial
                </Link>
                <p className="text-caption mt-3 text-center text-slate-400">
                  14-day free trial. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-[80rem] text-center">
          <h2 className="text-h1 text-slate-900">
            Ready to make better technology decisions?
          </h2>
          <p className="text-body mt-4 mx-auto max-w-xl text-slate-500">
            Join technology leaders who use CTOaaS to reduce decision risk, optimize costs,
            and stay ahead of industry trends.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-[8px] bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6">
        <div className="mx-auto flex max-w-[80rem] items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-brand text-white">
              <Brain className="h-3 w-3" />
            </div>
            <span className="text-body-sm font-medium text-slate-900">CTOaaS</span>
          </div>
          <p className="text-caption text-slate-400">
            AI-generated advisory. Not a substitute for professional advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
