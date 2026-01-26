import { ComingSoon } from '../components/common/ComingSoon';

/**
 * Methodology Page
 *
 * Explains how the GPU cost calculations work.
 * Currently in "coming soon" state.
 *
 * Future content will include:
 * - Training cost formula breakdown
 * - Inference cost formula breakdown
 * - FLOPs calculations
 * - Efficiency assumptions
 * - Data sources and accuracy
 */
export function Methodology() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Methodology
          </h1>

          <ComingSoon
            title="How Calculations Work"
            description={
              <div className="space-y-4">
                <p>
                  We're preparing detailed documentation on our calculation methodology.
                </p>
                <p className="text-sm">
                  This page will explain the formulas, assumptions, and data sources
                  used to estimate GPU costs for training and inference.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </main>
  );
}
