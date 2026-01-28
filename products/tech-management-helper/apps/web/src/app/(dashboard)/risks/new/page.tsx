'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { riskService } from '@/services/risk.service';
import type { CreateRiskInput, RiskStatus } from '@/types/risk';
import { RISK_STATUSES, RISK_CATEGORIES } from '@/types/risk';
import { ApiError } from '@/lib/api-client';

export default function NewRiskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateRiskInput>({
    title: '',
    description: '',
    category: 'Security',
    likelihood: 3,
    impact: 3,
    status: 'IDENTIFIED',
    mitigationPlan: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!formData.title.trim()) {
      setError('Risk title is required');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Risk description is required');
      setLoading(false);
      return;
    }

    try {
      const response = await riskService.createRisk(formData);
      // Navigate to the newly created risk
      router.push(`/risks/${response.risk.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create risk');
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/risks');
  };

  const riskScore = formData.likelihood * formData.impact;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Risk</h1>
        <p className="text-gray-600 mt-1">Add a new risk to the risk register</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Risk Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter risk title"
              disabled={loading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the risk in detail"
              disabled={loading}
              required
            />
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              >
                {RISK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RiskStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                {RISK_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Likelihood and Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="likelihood" className="block text-sm font-medium text-gray-700 mb-1">
                Likelihood <span className="text-red-500">*</span>
              </label>
              <select
                id="likelihood"
                value={formData.likelihood}
                onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} - {value === 1 ? 'Very Low' : value === 2 ? 'Low' : value === 3 ? 'Medium' : value === 4 ? 'High' : 'Very High'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Probability of occurrence (1-5)</p>
            </div>

            <div>
              <label htmlFor="impact" className="block text-sm font-medium text-gray-700 mb-1">
                Impact <span className="text-red-500">*</span>
              </label>
              <select
                id="impact"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} - {value === 1 ? 'Negligible' : value === 2 ? 'Minor' : value === 3 ? 'Moderate' : value === 4 ? 'Major' : 'Critical'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Severity of consequences (1-5)</p>
            </div>
          </div>

          {/* Risk Score Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Calculated Risk Score</p>
                <p className="text-xs text-gray-500 mt-1">Likelihood × Impact</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{riskScore}</p>
                <p className={`text-sm font-medium ${
                  riskScore >= 15 ? 'text-red-600' : riskScore >= 6 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {riskScore >= 15 ? 'High Risk' : riskScore >= 6 ? 'Medium Risk' : 'Low Risk'}
                </p>
              </div>
            </div>
          </div>

          {/* Mitigation Plan */}
          <div>
            <label htmlFor="mitigationPlan" className="block text-sm font-medium text-gray-700 mb-1">
              Mitigation Plan
            </label>
            <textarea
              id="mitigationPlan"
              value={formData.mitigationPlan}
              onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the plan to mitigate this risk (optional)"
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Risk'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
