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

        <form className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              disabled
              placeholder="Your full name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              disabled
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              id="contact-subject"
              disabled
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-50"
            >
              <option>General Inquiry</option>
              <option>Employer Access</option>
              <option>Technical Support</option>
              <option>Partnership</option>
            </select>
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="contact-message"
              rows={4}
              disabled
              placeholder="How can we help?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            Send Message
          </button>
          <p className="text-sm text-gray-500 text-center">
            Or email us directly at{' '}
            <a
              href="mailto:hello@connectgrc.com"
              className="text-accent hover:underline"
            >
              hello@connectgrc.com
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
