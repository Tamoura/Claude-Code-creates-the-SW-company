import Link from 'next/link';

const footerLinks = {
  Platform: [
    { label: 'For Talents', href: '/for-talents' },
    { label: 'For Employers', href: '/for-employers' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Resources: [
    { label: 'Resource Hub', href: '/resources' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-xl">ConnectGRC</span>
            </div>
            <p className="text-primary-200 text-sm leading-relaxed">
              AI-powered GRC career platform connecting professionals with
              employers through intelligent assessments and career
              development tools.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-primary-200 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-primary-500 mt-10 pt-6 text-center text-primary-300 text-sm">
          &copy; {new Date().getFullYear()} ConnectGRC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
