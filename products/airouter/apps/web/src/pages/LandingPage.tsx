import { Link } from 'react-router-dom';

const VALUE_PROPS = [
  {
    title: 'Bring Your Own Keys',
    description:
      'Use your free-tier API keys from Google, Groq, DeepSeek, and more. We never store your keys on our servers.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
  },
  {
    title: 'Smart Routing',
    description:
      'Automatically route requests to the fastest available provider. Optimize for speed, cost, or model quality.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: 'Automatic Failover',
    description:
      'When one provider goes down, requests seamlessly fail over to the next available provider. Zero downtime.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: 'Zero Cost',
    description:
      'AIRouter is free. You only use the free tiers of providers you already have keys for. No hidden fees.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Add Your Keys',
    description:
      'Paste your free-tier API keys from providers like Google Gemini, Groq, Cerebras, and others.',
  },
  {
    step: '2',
    title: 'Route Requests',
    description:
      'Send requests to our unified endpoint. AIRouter picks the best available provider automatically.',
  },
  {
    step: '3',
    title: 'Track Usage',
    description:
      'Monitor which providers handle your requests, track latency, and optimize your routing strategy.',
  },
];

const PROVIDERS = [
  'Google Gemini',
  'Groq',
  'Cerebras',
  'SambaNova',
  'OpenRouter',
  'Cohere',
  'HuggingFace',
  'Mistral',
  'Cloudflare',
  'DeepSeek',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-card-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-text-primary">
              AIRouter
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="text-sm bg-accent-blue text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          10 Free Providers Available
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
          Free AI APIs,
          <br />
          <span className="text-accent-blue">One Endpoint</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
          Route AI requests across free-tier providers with smart failover.
          Bring your own keys, get intelligent routing, pay nothing.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/signup"
            className="bg-accent-blue text-white px-8 py-3 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <a
            href="#how-it-works"
            className="border border-card-border text-text-secondary px-8 py-3 rounded-lg text-lg hover:text-text-primary hover:border-text-muted transition-colors"
          >
            How It Works
          </a>
        </div>

        {/* Code snippet */}
        <div className="mt-16 max-w-2xl mx-auto text-left">
          <div className="bg-code-bg border border-card-border rounded-xl p-6 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <pre className="text-sm text-text-secondary">
              <code>{`curl https://api.airouter.dev/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_AIROUTER_KEY" \\
  -d '{
    "model": "auto",
    "messages": [{
      "role": "user",
      "content": "Hello, world!"
    }]
  }'`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
          Why AIRouter?
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="bg-card-bg border border-card-border rounded-xl p-6"
            >
              <div className="w-12 h-12 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-4">
                {prop.icon}
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {prop.title}
              </h3>
              <p className="text-text-secondary">{prop.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent-blue text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {item.title}
              </h3>
              <p className="text-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Providers */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-8">
          Supported Providers
        </h2>
        <p className="text-text-secondary text-center mb-10">
          All with free tiers. Bring your own keys and start routing.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {PROVIDERS.map((name) => (
            <span
              key={name}
              className="px-4 py-2 rounded-lg bg-card-bg border border-card-border text-text-secondary text-sm"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-card-bg border border-card-border rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to get started?
          </h2>
          <p className="text-text-secondary mb-8 max-w-lg mx-auto">
            Sign up in seconds, add your free-tier keys, and start
            routing AI requests with zero cost.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-accent-blue text-white px-8 py-3 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            AIRouter by ConnectSW
          </p>
          <p className="text-sm text-text-muted">
            Open source. Zero cost. Developer-first.
          </p>
        </div>
      </footer>
    </div>
  );
}
