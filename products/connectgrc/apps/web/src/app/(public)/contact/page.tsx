export default function ContactPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
          Contact Us
        </h1>
        <p className="text-gray-600 mb-10 text-center">
          Have questions about ConnectGRC? We would love to hear from
          you.
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600 text-center py-8">
            Contact form coming soon. In the meantime, reach out to us
            at{' '}
            <a
              href="mailto:hello@connectgrc.com"
              className="text-accent hover:underline"
            >
              hello@connectgrc.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
