export default function TermsPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
          Terms of Service
        </h1>

        <div className="space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ConnectGRC, you agree to be bound by
              these Terms of Service and all applicable laws and
              regulations. If you do not agree with any of these terms,
              you are prohibited from using this platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Use License
            </h2>
            <p>
              ConnectGRC grants you a limited, non-exclusive,
              non-transferable license to access and use the platform for
              your personal and professional development purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Privacy
            </h2>
            <p>
              Your privacy is important to us. Assessment data,
              transcripts, and career information are kept confidential
              and are never shared with third parties without your
              explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Assessment Integrity
            </h2>
            <p>
              You agree to complete assessments honestly and without
              external assistance. ConnectGRC reserves the right to
              invalidate assessment results if integrity violations are
              detected.
            </p>
          </section>

          <p className="text-sm text-gray-400 pt-4">
            Last updated: February 2026
          </p>
        </div>
      </div>
    </div>
  );
}
