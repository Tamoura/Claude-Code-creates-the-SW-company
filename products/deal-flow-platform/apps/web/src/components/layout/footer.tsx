export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            © {currentYear} DealGate. All rights reserved.
          </div>

          <div className="flex gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-maroon transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-maroon transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-maroon transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
