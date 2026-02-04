/**
 * PublicFooter Component
 *
 * Footer for public-facing pages.
 * Shows copyright and product info.
 */

export default function PublicFooter() {
  return (
    <footer className="border-t border-card-border">
      <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-text-muted">
        <p>© 2026 StableFlow — Stablecoin Payment Infrastructure</p>
      </div>
    </footer>
  );
}
