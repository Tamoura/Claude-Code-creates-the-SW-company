export default function AboutPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          About ConnectGRC
        </h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          ConnectGRC is the first AI-native talent platform built
          specifically for Governance, Risk, and Compliance
          professionals. We believe that GRC expertise is critical to
          every organization, and professionals deserve specialized
          tools to develop and showcase their skills.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Our Mission
            </h2>
            <p className="text-gray-600 leading-relaxed">
              To empower GRC professionals with AI-driven tools that
              accurately assess their expertise, guide their career
              development, and connect them with organizations that
              value their skills.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              What Makes Us Different
            </h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex gap-3">
                <span className="text-secondary font-bold">1.</span>
                <span>
                  <strong>GRC-Native:</strong> Built from the ground up
                  for GRC, not a generic platform with GRC bolted on.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary font-bold">2.</span>
                <span>
                  <strong>AI-Powered Assessments:</strong> Voice-based
                  evaluations scored by AI against expert-curated golden
                  answers.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary font-bold">3.</span>
                <span>
                  <strong>Career Intelligence:</strong> Personalized
                  career simulations with ROI analysis on certifications
                  and skill development.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
