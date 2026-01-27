import { ComingSoon } from '../components/common/ComingSoon';

/**
 * About Page
 *
 * Information about the GPU Calculator project.
 * Currently in "coming soon" state.
 *
 * Future content will include:
 * - Project mission and goals
 * - Open source information
 * - Contributing guidelines
 * - Team/author information
 * - License details (MIT)
 */
export function About() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            About
          </h1>

          <ComingSoon
            title="About This Calculator"
            description={
              <div className="space-y-4">
                <p>
                  We're preparing information about this project, its mission,
                  and how to contribute.
                </p>
                <p className="text-sm">
                  This tool is designed to help you estimate and compare GPU costs
                  across different cloud providers for AI workloads.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
}
