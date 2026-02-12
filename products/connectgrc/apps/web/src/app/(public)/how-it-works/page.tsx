import Link from 'next/link';

const steps = [
  {
    step: 1,
    title: 'Create Your Profile',
    description:
      'Sign up, tell us about your GRC experience, certifications, and the frameworks you work with.',
  },
  {
    step: 2,
    title: 'Take the Assessment',
    description:
      'Complete a 25-question voice-based assessment. Questions are calibrated to your experience level across six GRC domains.',
  },
  {
    step: 3,
    title: 'Get Your Tier',
    description:
      'AI scores your answers against expert-curated golden answers. You receive a professional tier placement and detailed feedback.',
  },
  {
    step: 4,
    title: 'Plan Your Career',
    description:
      'Use the Career Simulator and AI counselor to map out your next move, from certifications to role transitions.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
          How ConnectGRC Works
        </h1>
        <p className="text-lg text-gray-600 mb-16 text-center max-w-2xl mx-auto">
          Four simple steps to assess your GRC expertise and plan your
          career growth.
        </p>

        <div className="space-y-12">
          {steps.map((item) => (
            <div key={item.step} className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {item.step}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/register"
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}
