/**
 * Footer Component
 *
 * Simple footer for dashboard pages (optional)
 */
export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>&copy; 2026 Tech Management Helper</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-900">Privacy</a>
          <a href="#" className="hover:text-gray-900">Terms</a>
          <a href="#" className="hover:text-gray-900">Support</a>
        </div>
      </div>
    </footer>
  )
}
