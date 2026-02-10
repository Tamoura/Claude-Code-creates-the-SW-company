'use client';

import { useState, useEffect } from 'react';
import { DIMENSIONS } from '../../../lib/dimensions';
import DimensionCard from '../../../components/dashboard/DimensionCard';
import { apiClient, type Child, type DashboardData } from '../../../lib/api-client';

export default function DimensionsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch children on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // If only one child, select automatically
        if (response.data.length === 1) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, []);

  // Fetch dashboard data when child is selected
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await apiClient.getDashboard(selectedChildId);
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [selectedChildId]);

  const getScoreForDimension = (dimensionSlug: string): number => {
    if (!dashboardData) return 0;
    const dimData = dashboardData.dimensions.find((d) => d.dimension === dimensionSlug);
    return dimData?.score || 0;
  };

  const getObservationCountForDimension = (dimensionSlug: string): number => {
    if (!dashboardData) return 0;
    const dimData = dashboardData.dimensions.find((d) => d.dimension === dimensionSlug);
    return dimData?.observationCount || 0;
  };

  // Loading state
  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dimensions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore all six dimensions of your child&apos;s development.
        </p>
      </div>

      {/* Child Selector (if multiple children) */}
      {children.length > 1 && (
        <div>
          <label htmlFor="child-select-dimensions" className="label">
            Select Child
          </label>
          <select
            id="child-select-dimensions"
            className="input-field max-w-xs"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            <option value="">Choose a child...</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* No child selected */}
      {!selectedChildId && (
        <div className="card text-center py-16">
          <h2 className="text-sm font-medium text-slate-900 mb-1">
            No child selected
          </h2>
          <p className="text-xs text-slate-500">
            Please select a child to view their dimensions.
          </p>
        </div>
      )}

      {/* Dimensions Grid */}
      {selectedChildId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DIMENSIONS.map((dimension) => (
            <DimensionCard
              key={dimension.slug}
              dimension={dimension}
              score={getScoreForDimension(dimension.slug)}
              observationCount={getObservationCountForDimension(dimension.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
