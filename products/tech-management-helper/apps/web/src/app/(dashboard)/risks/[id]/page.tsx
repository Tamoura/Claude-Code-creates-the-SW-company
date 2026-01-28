'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { riskService } from '@/services/risk.service';
import type { Risk, UpdateRiskInput, RiskStatus } from '@/types/risk';
import {
  getRiskScoreColor,
  getRiskLevel,
  getStatusColor,
  RISK_STATUSES,
  RISK_CATEGORIES,
} from '@/types/risk';
import { ApiError } from '@/lib/api-client';

export default function RiskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const riskId = params.id as string;

  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<UpdateRiskInput>({});

  const fetchRisk = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await riskService.getRisk(riskId);
      setRisk(response.risk);
      // Initialize edit data
      setEditData({
        title: response.risk.title,
        description: response.risk.description,
        category: response.risk.category,
        likelihood: response.risk.likelihood,
        impact: response.risk.impact,
        status: response.risk.status,
        mitigationPlan: response.risk.mitigationPlan || '',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Risk not found');
        } else {
          setError(err.message || 'Failed to load risk');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [riskId]);

  // Fetch risk on mount
  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (risk) {
      setEditData({
        title: risk.title,
        description: risk.description,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        mitigationPlan: risk.mitigationPlan || '',
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!risk) return;

    setIsSaving(true);
    try {
      const response = await riskService.updateRisk(risk.id, editData);
      setRisk(response.risk);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update risk');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!risk) return;

    setIsDeleting(true);
    try {
      await riskService.deleteRisk(risk.id);
      router.push('/risks');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to delete risk');
      } else {
        setError('An unexpected error occurred');
      }
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading risk...</p>
        </div>
      </div>
    );
  }

  if (error && !risk) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={() => router.push('/risks')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Risks
        </button>
      </div>
    );
  }

  if (!risk) {
    return null;
  }

  const calculatedScore = (editData.likelihood || risk.likelihood) * (editData.impact || risk.impact);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <button
            onClick={() => router.push('/risks')}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Risks
          </button>
          {isEditing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="text-3xl font-bold text-gray-900 w-full border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900">{risk.title}</h1>
          )}
          <p className="text-gray-600 mt-1">Risk ID: {risk.id}</p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{risk.description}</p>
            )}
          </div>

          {/* Mitigation Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mitigation Plan</h2>
            {isEditing ? (
              <textarea
                value={editData.mitigationPlan}
                onChange={(e) => setEditData({ ...editData, mitigationPlan: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the mitigation plan..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {risk.mitigationPlan || 'No mitigation plan specified'}
              </p>
            )}
          </div>

          {/* Linked Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Controls</h2>
            {risk.controls && risk.controls.length > 0 ? (
              <div className="space-y-2">
                {risk.controls.map((item) => (
                  <div
                    key={item.control.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.control.code}</p>
                      <p className="text-sm text-gray-600">{item.control.title}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      {item.control.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No controls linked to this risk</p>
            )}
          </div>

          {/* Linked Assets */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Assets</h2>
            {risk.assets && risk.assets.length > 0 ? (
              <div className="space-y-2">
                {risk.assets.map((item) => (
                  <div
                    key={item.asset.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.asset.name}</p>
                      <p className="text-sm text-gray-600">{item.asset.type}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {item.asset.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No assets linked to this risk</p>
            )}
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Risk Score */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Score</h2>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold border-4 ${
                calculatedScore >= 15
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : calculatedScore >= 6
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-green-100 text-green-800 border-green-200'
              }`}>
                {calculatedScore}
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                {getRiskLevel(calculatedScore)} Risk
              </p>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Likelihood
                </label>
                {isEditing ? (
                  <select
                    value={editData.likelihood}
                    onChange={(e) => setEditData({ ...editData, likelihood: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{risk.likelihood} / 5</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impact
                </label>
                {isEditing ? (
                  <select
                    value={editData.impact}
                    onChange={(e) => setEditData({ ...editData, impact: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{risk.impact} / 5</p>
                )}
              </div>
            </div>
          </div>

          {/* Properties */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                {isEditing ? (
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {RISK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{risk.category}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as RiskStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {RISK_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(risk.status)}`}>
                    {risk.status}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner
                </label>
                <p className="text-gray-900">{risk.owner?.name || 'Unassigned'}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <p className="text-gray-900">{new Date(risk.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Updated:</span>
                <p className="text-gray-900">{new Date(risk.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Risk</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this risk? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
